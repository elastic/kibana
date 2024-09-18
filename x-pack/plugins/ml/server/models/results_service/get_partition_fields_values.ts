/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { type MlPartitionFieldsType, ML_PARTITION_FIELDS } from '@kbn/ml-anomaly-utils';
import type { CriteriaField } from './results_service';
import type { FieldConfig, FieldsConfig } from '../../routes/schemas/results_service_schema';
import type { MlClient } from '../../lib/ml_client';

type SearchTerm =
  | {
      [key in MlPartitionFieldsType]?: string;
    }
  | undefined;

export interface PartitionFieldData {
  name: string;
  values: Array<{ value: string; maxRecordScore?: number }>;
}

import util from 'util';
/**
 * Gets an object for aggregation query to retrieve field name and values.
 * @param fieldType - Field type
 * @param isModelPlotSearch
 * @param query - Optional query string for partition value
 * @param fieldConfig - Optional config for filtering and sorting
 * @returns {Object}
 */
function getFieldAgg(
  fieldType: MlPartitionFieldsType,
  isModelPlotSearch: boolean,
  query?: string,
  fieldConfig?: FieldConfig
) {
  const AGG_SIZE = 100;

  const fieldNameKey = `${fieldType}_name`;
  const fieldValueKey = `${fieldType}_value`;

  const sortByField =
    fieldConfig?.sort?.by === 'name' || isModelPlotSearch ? '_key' : 'maxRecordScore';

  return {
    [fieldNameKey]: {
      terms: {
        field: fieldNameKey,
      },
    },
    [fieldValueKey]: {
      filter: {
        bool: {
          must: [
            ...(query
              ? [
                  {
                    wildcard: {
                      [fieldValueKey]: {
                        value: `*${query}*`,
                      },
                    },
                  },
                ]
              : []),
            ...(fieldConfig?.anomalousOnly
              ? [
                  {
                    range: {
                      record_score: {
                        gt: 0,
                      },
                    },
                  },
                ]
              : []),
            ...(fieldConfig?.filterBy
              ? [
                  {
                    wildcard: {
                      [fieldConfig.filterBy.field]: {
                        value: `*${fieldConfig.filterBy.query}*`,
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      },
      aggs: {
        values: {
          terms: {
            size: AGG_SIZE,
            field: fieldValueKey,
            ...(fieldConfig?.sort
              ? {
                  order: {
                    [sortByField]: fieldConfig.sort.order ?? 'desc',
                  },
                }
              : {}),
          },
          ...(isModelPlotSearch
            ? {}
            : {
                aggs: {
                  maxRecordScore: {
                    max: {
                      field: 'record_score',
                    },
                  },
                },
              }),
        },
      },
    },
  };
}

/**
 * Gets formatted result for particular field from aggregation response.
 * @param fieldType - Field type
 * @param aggs - Aggregation response
 */
function getFieldObject(
  fieldType: MlPartitionFieldsType,
  aggs: Record<estypes.AggregateName, estypes.AggregationsAggregate>
): Record<MlPartitionFieldsType, PartitionFieldData> | {} {
  const fieldNameKey = `${fieldType}_name` as const;
  const fieldValueKey = `${fieldType}_value` as const;

  const fieldNameAgg = aggs[fieldNameKey] as estypes.AggregationsMultiTermsAggregate;
  const fieldValueAgg = aggs[fieldValueKey] as unknown as {
    values: estypes.AggregationsMultiBucketAggregateBase<{
      key: string;
      maxRecordScore?: { value: number };
    }>;
  };

  return Array.isArray(fieldNameAgg.buckets) && fieldNameAgg.buckets.length > 0
    ? {
        [fieldType]: {
          name: fieldNameAgg.buckets[0].key,
          values: Array.isArray(fieldValueAgg.values.buckets)
            ? fieldValueAgg.values.buckets.map(({ key, maxRecordScore }) => ({
                value: key,
                ...(maxRecordScore ? { maxRecordScore: maxRecordScore.value } : {}),
              }))
            : [],
        },
      }
    : {};
}

export type PartitionFieldValueResponse = Record<MlPartitionFieldsType, PartitionFieldData>;

export const getPartitionFieldsValuesFactory = (mlClient: MlClient) =>
  /**
   * Gets the record of partition fields with possible values that fit the provided queries.
   * @param jobId - Job ID
   * @param searchTerm - object of queries for partition fields, e.g. { partition_field: 'query' }
   * @param criteriaFields - key - value pairs of the term field, e.g. { detector_index: 0 }
   * @param earliestMs
   * @param latestMs
   * @param fieldsConfig
   */
  async function getPartitionFieldsValues(
    jobId: string,
    searchTerm: SearchTerm = {},
    criteriaFields: CriteriaField[],
    earliestMs: number,
    latestMs: number,
    fieldsConfig: FieldsConfig = {}
  ): Promise<PartitionFieldValueResponse | {}> {
    const jobsResponse = await mlClient.getJobs({ job_id: jobId });
    if (jobsResponse.count === 0 || jobsResponse.jobs === undefined) {
      throw Boom.notFound(`Job with the id "${jobId}" not found`);
    }

    const job = jobsResponse.jobs[0];

    const isModelPlotEnabled = !!job?.model_plot_config?.enabled;
    const isAnomalousOnly = (Object.entries(fieldsConfig) as Array<[string, FieldConfig]>).some(
      ([k, v]) => {
        return !!v?.anomalousOnly;
      }
    );

    const applyTimeRange = (Object.entries(fieldsConfig) as Array<[string, FieldConfig]>).some(
      ([k, v]) => {
        return !!v?.applyTimeRange;
      }
    );

    const isModelPlotSearch = isModelPlotEnabled && !isAnomalousOnly;

    // Remove the time filter in case model plot is not enabled
    // and time range is not applied, so
    // it includes the records that occurred as anomalies historically
    const searchAllTime = !isModelPlotEnabled && !applyTimeRange;

    const requestBody: estypes.SearchRequest['body'] = {
      query: {
        bool: {
          filter: [
            ...criteriaFields.map(({ fieldName, fieldValue }) => {
              return {
                term: {
                  [fieldName]: fieldValue,
                },
              };
            }),
            {
              term: {
                job_id: jobId,
              },
            },
            ...(searchAllTime
              ? []
              : [
                  {
                    range: {
                      timestamp: {
                        gte: earliestMs,
                        lte: latestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ]),
            {
              term: {
                result_type: isModelPlotSearch ? 'model_plot' : 'record',
              },
            },
          ],
        },
      },
      aggs: {
        ...ML_PARTITION_FIELDS.reduce((acc, key) => {
          return Object.assign(
            acc,
            getFieldAgg(key, isModelPlotSearch, searchTerm[key], fieldsConfig[key])
          );
        }, {}),
      },
    };
    console.log(util.inspect(requestBody, { showHidden: false, depth: null, colors: true }));
    const body = await mlClient.anomalySearch(
      {
        body: {
          ...requestBody,
          size: 0,
        },
      },
      [jobId]
    );

    return ML_PARTITION_FIELDS.reduce((acc, key) => {
      return Object.assign(acc, getFieldObject(key, body.aggregations!));
    }, {});
  };
