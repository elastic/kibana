/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy, slice, get, cloneDeep } from 'lodash';
import moment from 'moment';
import Boom from '@hapi/boom';
import { IScopedClusterClient } from '@kbn/core/server';
import { buildAnomalyTableItems } from './build_anomaly_table_items';
import { ANOMALIES_TABLE_DEFAULT_QUERY_SIZE } from '../../../common/constants/search';
import { getPartitionFieldsValuesFactory } from './get_partition_fields_values';
import {
  AnomaliesTableRecord,
  AnomalyCategorizerStatsDoc,
  AnomalyRecordDoc,
} from '../../../common/types/anomalies';
import { JOB_ID, PARTITION_FIELD_VALUE } from '../../../common/constants/anomalies';
import {
  GetStoppedPartitionResult,
  GetDatafeedResultsChartDataResult,
  defaultSearchQuery,
  DatafeedResultsChartDataParams,
} from '../../../common/types/results';
import type { MlClient } from '../../lib/ml_client';
import { datafeedsProvider } from '../job_service/datafeeds';
import { annotationServiceProvider } from '../annotation_service';
import { showActualForFunction, showTypicalForFunction } from '../../../common/util/anomaly_utils';
import { anomalyChartsDataProvider } from './anomaly_charts';

// Service for carrying out Elasticsearch queries to obtain data for the
// ML Results dashboards.

const DEFAULT_MAX_EXAMPLES = 500;

export interface CriteriaField {
  fieldType?: string;
  fieldName: string;
  fieldValue: any;
}

interface Influencer {
  fieldName: string;
  fieldValue: any;
}

/**
 * Extracts typical and actual values from the anomaly record.
 * @param source
 */
export function getTypicalAndActualValues(source: AnomalyRecordDoc) {
  const result: { actual?: number[]; typical?: number[] } = {};

  const functionDescription = source.function_description || '';
  const causes = source.causes || [];

  if (showActualForFunction(functionDescription)) {
    if (source.actual !== undefined) {
      result.actual = source.actual;
    } else {
      if (causes.length === 1) {
        result.actual = causes[0].actual;
      }
    }
  }

  if (showTypicalForFunction(functionDescription)) {
    if (source.typical !== undefined) {
      result.typical = source.typical;
    } else {
      if (causes.length === 1) {
        result.typical = causes[0].typical;
      }
    }
  }

  return result;
}

export function resultsServiceProvider(mlClient: MlClient, client?: IScopedClusterClient) {
  // Obtains data for the anomalies table, aggregating anomalies by day or hour as requested.
  // Return an Object with properties 'anomalies' and 'interval' (interval used to aggregate anomalies,
  // one of day, hour or second. Note 'auto' can be provided as the aggregationInterval in the request,
  // in which case the interval is determined according to the time span between the first and
  // last anomalies),  plus an examplesByJobId property if any of the
  // anomalies are categorization anomalies in mlcategory.
  async function getAnomaliesTableData(
    jobIds: string[],
    criteriaFields: CriteriaField[],
    influencers: Influencer[],
    aggregationInterval: string,
    threshold: number,
    earliestMs: number,
    latestMs: number,
    dateFormatTz: string,
    maxRecords: number = ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
    maxExamples: number = DEFAULT_MAX_EXAMPLES,
    influencersFilterQuery?: any,
    functionDescription?: string
  ) {
    // Build the query to return the matching anomaly record results.
    // Add criteria for the time range, record score, plus any specified job IDs.
    const boolCriteria: object[] = [
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
      {
        range: {
          record_score: {
            gte: threshold,
          },
        },
      },
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    // Add in term queries for each of the specified criteria.
    criteriaFields.forEach((criteria) => {
      boolCriteria.push({
        term: {
          [criteria.fieldName]: criteria.fieldValue,
        },
      });
    });
    if (functionDescription !== undefined) {
      boolCriteria.push({
        term: {
          function_description: functionDescription,
        },
      });
    }

    if (influencersFilterQuery !== undefined) {
      boolCriteria.push(influencersFilterQuery);
    }

    // Add a nested query to filter for each of the specified influencers.
    if (influencers.length > 0) {
      boolCriteria.push({
        bool: {
          should: influencers.map((influencer) => {
            return {
              nested: {
                path: 'influencers',
                query: {
                  bool: {
                    must: [
                      {
                        match: {
                          'influencers.influencer_field_name': influencer.fieldName,
                        },
                      },
                      {
                        match: {
                          'influencers.influencer_field_values': influencer.fieldValue,
                        },
                      },
                    ],
                  },
                },
              },
            };
          }),
          minimum_should_match: 1,
        },
      });
    }

    const body = await mlClient.anomalySearch(
      {
        size: maxRecords,
        body: {
          query: {
            bool: {
              filter: [
                {
                  query_string: {
                    query: 'result_type:record',
                    analyze_wildcard: false,
                  },
                },
                {
                  bool: {
                    must: boolCriteria,
                  },
                },
              ],
            },
          },
          sort: [{ record_score: { order: 'desc' } }],
        },
      },
      jobIds
    );

    const tableData: {
      anomalies: AnomaliesTableRecord[];
      interval: string;
      examplesByJobId?: { [key: string]: any };
    } = {
      anomalies: [],
      interval: 'second',
    };
    // @ts-expect-error incorrect search response type
    if (body.hits.total.value > 0) {
      let records: AnomalyRecordDoc[] = [];
      body.hits.hits.forEach((hit: any) => {
        records.push(hit._source);
      });

      // Sort anomalies in ascending time order.
      records = sortBy(records, 'timestamp');
      tableData.interval = aggregationInterval;
      if (aggregationInterval === 'auto') {
        // Determine the actual interval to use if aggregating.
        const earliest = moment(records[0].timestamp);
        const latest = moment(records[records.length - 1].timestamp);

        const daysDiff = latest.diff(earliest, 'days');
        tableData.interval = daysDiff < 2 ? 'hour' : 'day';
      }

      tableData.anomalies = buildAnomalyTableItems(records, tableData.interval, dateFormatTz);

      // Load examples for any categorization anomalies.
      const categoryAnomalies = tableData.anomalies.filter(
        (item: any) => item.entityName === 'mlcategory'
      );
      if (categoryAnomalies.length > 0) {
        tableData.examplesByJobId = {};

        const categoryIdsByJobId: { [key: string]: any } = {};
        categoryAnomalies.forEach((anomaly) => {
          if (categoryIdsByJobId[anomaly.jobId] === undefined) {
            categoryIdsByJobId[anomaly.jobId] = [];
          }
          if (categoryIdsByJobId[anomaly.jobId].indexOf(anomaly.entityValue) === -1) {
            categoryIdsByJobId[anomaly.jobId].push(anomaly.entityValue);
          }
        });

        const categoryJobIds = Object.keys(categoryIdsByJobId);
        await Promise.all(
          categoryJobIds.map(async (jobId) => {
            const examplesByCategoryId = await getCategoryExamples(
              jobId,
              categoryIdsByJobId[jobId],
              maxExamples
            );
            if (tableData.examplesByJobId !== undefined) {
              tableData.examplesByJobId[jobId] = examplesByCategoryId;
            }
          })
        );
      }
    }

    return tableData;
  }

  // Returns the maximum anomaly_score for result_type:bucket over jobIds for the interval passed in
  async function getMaxAnomalyScore(jobIds: string[] = [], earliestMs: number, latestMs: number) {
    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    const boolCriteria: object[] = [
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
    ];

    if (jobIds.length > 0) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    const query = {
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:bucket',
                  analyze_wildcard: false,
                },
              },
              {
                bool: {
                  must: boolCriteria,
                },
              },
            ],
          },
        },
        aggs: {
          max_score: {
            max: {
              field: 'anomaly_score',
            },
          },
        },
      },
    };

    const body = await mlClient.anomalySearch(query, jobIds);
    const maxScore = get(body, ['aggregations', 'max_score', 'value'], null);

    return { maxScore };
  }

  // Obtains the latest bucket result timestamp by job ID.
  // Returns data over all jobs unless an optional list of job IDs of interest is supplied.
  // Returned response consists of latest bucket timestamps (ms since Jan 1 1970) against job ID
  async function getLatestBucketTimestampByJob(jobIds: string[] = []) {
    const filter: object[] = [
      {
        term: {
          result_type: 'bucket',
        },
      },
    ];

    if (jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      filter.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    // Size of job terms agg, consistent with maximum number of jobs supported by Java endpoints.
    const maxJobs = 10000;

    const body = await mlClient.anomalySearch(
      {
        size: 0,
        body: {
          query: {
            bool: {
              filter,
            },
          },
          aggs: {
            byJobId: {
              terms: {
                field: 'job_id',
                size: maxJobs,
              },
              aggs: {
                maxTimestamp: {
                  max: {
                    field: 'timestamp',
                  },
                },
              },
            },
          },
        },
      },
      jobIds
    );

    const bucketsByJobId: Array<{ key: string; maxTimestamp: { value?: number } }> = get(
      body,
      ['aggregations', 'byJobId', 'buckets'],
      []
    );
    const timestampByJobId: { [key: string]: number | undefined } = {};
    bucketsByJobId.forEach((bucket) => {
      timestampByJobId[bucket.key] = bucket.maxTimestamp.value;
    });

    return timestampByJobId;
  }

  // Obtains the categorization examples for the categories with the specified IDs
  // from the given index and job ID.
  // Returned response consists of a list of examples against category ID.
  async function getCategoryExamples(jobId: string, categoryIds: any, maxExamples: number) {
    const body = await mlClient.anomalySearch(
      {
        size: ANOMALIES_TABLE_DEFAULT_QUERY_SIZE, // Matches size of records in anomaly summary table.
        body: {
          query: {
            bool: {
              filter: [{ term: { job_id: jobId } }, { terms: { category_id: categoryIds } }],
            },
          },
        },
      },
      [jobId]
    );

    const examplesByCategoryId: { [key: string]: any } = {};
    // @ts-expect-error incorrect search response type
    if (body.hits.total.value > 0) {
      body.hits.hits.forEach((hit: any) => {
        if (maxExamples) {
          examplesByCategoryId[hit._source.category_id] = slice(
            hit._source.examples,
            0,
            Math.min(hit._source.examples.length, maxExamples)
          );
        } else {
          examplesByCategoryId[hit._source.category_id] = hit._source.examples;
        }
      });
    }

    return examplesByCategoryId;
  }

  // Obtains the definition of the category with the specified ID and job ID.
  // Returned response contains four properties - categoryId, regex, examples
  // and terms (space delimited String of the common tokens matched in values of the category).
  async function getCategoryDefinition(jobId: string, categoryId: string) {
    const body = await mlClient.anomalySearch<any>(
      {
        size: 1,
        body: {
          query: {
            bool: {
              filter: [{ term: { job_id: jobId } }, { term: { category_id: categoryId } }],
            },
          },
        },
      },
      [jobId]
    );

    const definition = { categoryId, terms: null, regex: null, examples: [] };
    // @ts-expect-error incorrect search response type
    if (body.hits.total.value > 0) {
      const source = body.hits.hits[0]._source;
      definition.categoryId = source.category_id;
      definition.regex = source.regex;
      definition.terms = source.terms;
      definition.examples = source.examples;
    }

    return definition;
  }

  async function getCategorizerStats(jobId: string, partitionByValue?: string) {
    const mustMatchClauses: Array<Record<'match', Record<string, string>>> = [
      {
        match: {
          result_type: 'categorizer_stats',
        },
      },
    ];

    if (typeof partitionByValue === 'string') {
      mustMatchClauses.push({
        match: {
          partition_by_value: partitionByValue,
        },
      });
    }
    const body = await mlClient.anomalySearch<AnomalyCategorizerStatsDoc>(
      {
        body: {
          query: {
            bool: {
              must: mustMatchClauses,
              filter: [
                {
                  term: {
                    job_id: jobId,
                  },
                },
              ],
            },
          },
        },
      },
      [jobId]
    );
    return body ? body.hits.hits.map((r) => r._source) : [];
  }

  async function getCategoryStoppedPartitions(
    jobIds: string[],
    fieldToBucket: typeof JOB_ID | typeof PARTITION_FIELD_VALUE = PARTITION_FIELD_VALUE
  ): Promise<GetStoppedPartitionResult> {
    let finalResults: GetStoppedPartitionResult = {
      jobs: {},
    };
    // first determine from job config if stop_on_warn is true
    // if false return []
    const body = await mlClient.getJobs({
      job_id: jobIds.join(),
    });

    if (!body || body.jobs.length < 1) {
      throw Boom.notFound(`Unable to find anomaly detector jobs ${jobIds.join(', ')}`);
    }

    const jobIdsWithStopOnWarnSet = body.jobs
      .filter(
        (jobConfig) =>
          jobConfig.analysis_config?.per_partition_categorization?.stop_on_warn === true
      )
      .map((j) => j.job_id);

    let aggs: any;
    if (fieldToBucket === JOB_ID) {
      // if bucketing by job_id, then return list of job_ids with at least one stopped_partitions
      aggs = {
        unique_terms: {
          terms: {
            field: JOB_ID,
          },
        },
      };
    } else {
      // if bucketing by partition field value, then return list of unique stopped_partitions for each job
      aggs = {
        jobs: {
          terms: {
            field: JOB_ID,
          },
          aggs: {
            unique_stopped_partitions: {
              terms: {
                field: PARTITION_FIELD_VALUE,
              },
            },
          },
        },
      };
    }

    if (jobIdsWithStopOnWarnSet.length > 0) {
      // search for categorizer_stats documents for the current job where the categorization_status is warn
      // Return all the partition_field_value values from the documents found
      const mustMatchClauses: Array<Record<'match', Record<string, string>>> = [
        {
          match: {
            result_type: 'categorizer_stats',
          },
        },
        {
          match: {
            categorization_status: 'warn',
          },
        },
      ];
      const results = await mlClient.anomalySearch<any>(
        {
          size: 0,
          body: {
            query: {
              bool: {
                must: mustMatchClauses,
                filter: [
                  {
                    terms: {
                      job_id: jobIdsWithStopOnWarnSet,
                    },
                  },
                ],
              },
            },
            aggs,
          },
        },
        jobIds
      );
      if (fieldToBucket === JOB_ID) {
        finalResults = {
          // @ts-expect-error incorrect search response type
          jobs: results.aggregations?.unique_terms?.buckets.map(
            (b: { key: string; doc_count: number }) => b.key
          ),
        };
      } else if (fieldToBucket === PARTITION_FIELD_VALUE) {
        const jobs: Record<string, string[]> = jobIdsWithStopOnWarnSet.reduce(
          (obj: Record<string, string[]>, jobId: string) => {
            obj[jobId] = [];
            return obj;
          },
          {}
        );
        // @ts-expect-error incorrect search response type
        results.aggregations.jobs.buckets.forEach(
          (bucket: { key: string | number; unique_stopped_partitions: { buckets: any[] } }) => {
            jobs[bucket.key] = bucket.unique_stopped_partitions.buckets.map((b) => b.key);
          }
        );
        finalResults.jobs = jobs;
      }
    }

    return finalResults;
  }

  async function getDatafeedResultsChartData({
    jobId,
    start,
    end,
  }: DatafeedResultsChartDataParams): Promise<GetDatafeedResultsChartDataResult> {
    const finalResults: GetDatafeedResultsChartDataResult = {
      bucketResults: [],
      datafeedResults: [],
      annotationResultsRect: [],
      annotationResultsLine: [],
      modelSnapshotResultsLine: [],
    };

    const { getDatafeedByJobId } = datafeedsProvider(client!, mlClient);

    const [datafeedConfig, jobsResponse] = await Promise.all([
      getDatafeedByJobId(jobId),
      mlClient.getJobs({ job_id: jobId }),
    ]);

    if (jobsResponse && (jobsResponse.count === 0 || jobsResponse.jobs === undefined)) {
      throw Boom.notFound(`Job with the id "${jobId}" not found`);
    }

    const jobConfig = jobsResponse.jobs[0];
    const timefield = jobConfig.data_description.time_field!;
    const bucketSpan = jobConfig.analysis_config.bucket_span;

    if (datafeedConfig === undefined) {
      return finalResults;
    }

    const rangeFilter = {
      range: {
        [timefield]: { gte: start, lte: end },
      },
    };

    let datafeedQueryClone =
      datafeedConfig.query !== undefined ? cloneDeep(datafeedConfig.query) : defaultSearchQuery;

    if (datafeedQueryClone.bool !== undefined) {
      if (datafeedQueryClone.bool.filter === undefined) {
        datafeedQueryClone.bool.filter = [];
      }
      if (Array.isArray(datafeedQueryClone.bool.filter)) {
        datafeedQueryClone.bool.filter.push(rangeFilter);
      } else {
        // filter is an object so convert to array so we can add the rangeFilter
        const filterQuery = cloneDeep(datafeedQueryClone.bool.filter);
        datafeedQueryClone.bool.filter = [filterQuery, rangeFilter];
      }
    } else {
      // Not a bool query so convert to a bool query so we can add the range filter
      datafeedQueryClone = { bool: { must: [datafeedQueryClone], filter: [rangeFilter] } };
    }

    const esSearchRequest = {
      index: datafeedConfig.indices.join(','),
      body: {
        query: datafeedQueryClone,
        ...(datafeedConfig.runtime_mappings
          ? { runtime_mappings: datafeedConfig.runtime_mappings }
          : {}),
        aggs: {
          doc_count_by_bucket_span: {
            date_histogram: {
              field: timefield,
              fixed_interval: bucketSpan,
            },
          },
        },
        size: 0,
      },
      ...(datafeedConfig?.indices_options ?? {}),
    };

    if (client) {
      const { aggregations } = await client.asCurrentUser.search(esSearchRequest);

      finalResults.datafeedResults =
        // @ts-expect-error incorrect search response type
        aggregations?.doc_count_by_bucket_span?.buckets.map((result) => [
          result.key,
          result.doc_count,
        ]) || [];
    }

    const { getAnnotations } = annotationServiceProvider(client!);

    const [bucketResp, annotationResp, modelSnapshotsResp] = await Promise.all([
      mlClient.getBuckets({
        job_id: jobId,
        body: { desc: true, start: String(start), end: String(end), page: { from: 0, size: 1000 } },
      }),
      getAnnotations({
        jobIds: [jobId],
        earliestMs: start,
        latestMs: end,
        maxAnnotations: 1000,
      }),
      mlClient.getModelSnapshots({
        job_id: jobId,
        start: String(start),
        end: String(end),
      }),
    ]);

    const bucketResults = bucketResp?.buckets ?? [];
    bucketResults.forEach((dataForTime) => {
      const timestamp = Number(dataForTime?.timestamp);
      const eventCount = dataForTime?.event_count;
      finalResults.bucketResults.push([timestamp, eventCount]);
    });

    const annotationResults = annotationResp.annotations[jobId] || [];
    annotationResults.forEach((annotation) => {
      const timestamp = Number(annotation?.timestamp);
      const endTimestamp = Number(annotation?.end_timestamp);
      if (timestamp === endTimestamp) {
        finalResults.annotationResultsLine.push({
          dataValue: timestamp,
          details: annotation.annotation,
        });
      } else {
        finalResults.annotationResultsRect.push({
          coordinates: {
            x0: timestamp,
            x1: endTimestamp,
          },
          details: annotation.annotation,
          // Added for custom RectAnnotation tooltip with formatted timestamp
          header: timestamp,
        });
      }
    });

    const modelSnapshots = modelSnapshotsResp?.model_snapshots ?? [];
    modelSnapshots.forEach((modelSnapshot) => {
      const timestamp = Number(modelSnapshot?.timestamp);

      finalResults.modelSnapshotResultsLine.push({
        dataValue: timestamp,
        details: modelSnapshot.description,
      });
    });

    return finalResults;
  }

  return {
    getAnomaliesTableData,
    getCategoryDefinition,
    getCategoryExamples,
    getLatestBucketTimestampByJob,
    getMaxAnomalyScore,
    getPartitionFieldsValues: getPartitionFieldsValuesFactory(mlClient),
    getCategorizerStats,
    getCategoryStoppedPartitions,
    getDatafeedResultsChartData,
    getAnomalyChartsData: anomalyChartsDataProvider(mlClient, client!),
  };
}
