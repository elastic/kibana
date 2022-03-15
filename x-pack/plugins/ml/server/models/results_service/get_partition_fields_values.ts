/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { PARTITION_FIELDS } from '../../../common/constants/anomalies';
import { PartitionFieldsType } from '../../../common/types/anomalies';
import { CriteriaField } from './results_service';
import { FieldConfig, FieldsConfig } from '../../routes/schemas/results_service_schema';
import type { MlClient } from '../../lib/ml_client';

type SearchTerm =
  | {
      [key in PartitionFieldsType]?: string;
    }
  | undefined;

/**
 * Gets an object for aggregation query to retrieve field name and values.
 * @param fieldType - Field type
 * @param isModelPlotSearch
 * @param query - Optional query string for partition value
 * @param fieldConfig - Optional config for filtering and sorting
 * @returns {Object}
 */
function getFieldAgg(
  fieldType: PartitionFieldsType,
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
function getFieldObject(fieldType: PartitionFieldsType, aggs: any) {
  const fieldNameKey = `${fieldType}_name`;
  const fieldValueKey = `${fieldType}_value`;

  return aggs[fieldNameKey].buckets.length > 0
    ? {
        [fieldType]: {
          name: aggs[fieldNameKey].buckets[0].key,
          values: aggs[fieldValueKey].values.buckets.map(({ key, maxRecordScore }: any) => ({
            value: key,
            ...(maxRecordScore ? { maxRecordScore: maxRecordScore.value } : {}),
          })),
        },
      }
    : {};
}

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
  ) {
    const jobsResponse = await mlClient.getJobs({ job_id: jobId });
    if (jobsResponse.count === 0 || jobsResponse.jobs === undefined) {
      throw Boom.notFound(`Job with the id "${jobId}" not found`);
    }

    const job = jobsResponse.jobs[0];

    const isModelPlotEnabled = job?.model_plot_config?.enabled;
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

    const isModelPlotSearch = !!isModelPlotEnabled && !isAnomalousOnly;

    // Remove the time filter in case model plot is not enabled
    // and time range is not applied, so
    // it includes the records that occurred as anomalies historically
    const searchAllTime = !isModelPlotEnabled && !applyTimeRange;

    const requestBody = {
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
        ...PARTITION_FIELDS.reduce((acc, key) => {
          return {
            ...acc,
            ...getFieldAgg(key, isModelPlotSearch, searchTerm[key], fieldsConfig[key]),
          };
        }, {}),
      },
    };

    const body = await mlClient.anomalySearch(
      {
        size: 0,
        body: requestBody,
      },
      [jobId]
    );

    return PARTITION_FIELDS.reduce((acc, key) => {
      return {
        ...acc,
        ...getFieldObject(key, body.aggregations),
      };
    }, {});
  };
