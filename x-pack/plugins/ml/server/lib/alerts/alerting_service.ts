/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import rison from 'rison-node';
import { MlClient } from '../ml_client';
import {
  MlAnomalyDetectionAlertParams,
  MlAnomalyDetectionAlertPreviewRequest,
} from '../../routes/schemas/alerting_schema';
import { ANOMALY_RESULT_TYPE } from '../../../common/constants/anomalies';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import { AnomalyResultType } from '../../../common/types/anomalies';
import {
  AlertExecutionResult,
  InfluencerAnomalyAlertDoc,
  PreviewResponse,
  PreviewResultsKeys,
  RecordAnomalyAlertDoc,
  TopHitsResultsKeys,
} from '../../../common/types/alerts';
import { parseInterval } from '../../../common/util/parse_interval';
import { AnomalyDetectionAlertContext } from './register_anomaly_detection_alert_type';

function isDefined<T>(argument: T | undefined | null): argument is T {
  return argument !== undefined && argument !== null;
}

/**
 * Resolves the longest bucket span from the list and multiply it by 2.
 * @param bucketSpans Collection of bucket spans
 */
export function resolveTimeInterval(bucketSpans: string[]): string {
  return `${
    Math.max(
      ...bucketSpans
        .map((b) => parseInterval(b))
        .filter(isDefined)
        .map((v) => v.asSeconds())
    ) * 2
  }s`;
}

/**
 * Alerting related server-side methods
 * @param mlClient
 */
export function alertingServiceProvider(mlClient: MlClient) {
  const getAggResultsLabel = (resultType: AnomalyResultType) => {
    return {
      aggGroupLabel: `${resultType}_results` as PreviewResultsKeys,
      topHitsLabel: `top_${resultType}_hits` as TopHitsResultsKeys,
    };
  };

  const getCommonScriptedFields = () => {
    return {
      start: {
        script: {
          lang: 'painless',
          source: `LocalDateTime.ofEpochSecond((doc["timestamp"].value.getMillis()-((doc["bucket_span"].value * 1000)
 * params.padding)) / 1000, 0, ZoneOffset.UTC).toString()+\":00.000Z\"`,
          params: {
            padding: 10,
          },
        },
      },
      end: {
        script: {
          lang: 'painless',
          source: `LocalDateTime.ofEpochSecond((doc["timestamp"].value.getMillis()+((doc["bucket_span"].value * 1000)
 * params.padding)) / 1000, 0, ZoneOffset.UTC).toString()+\":00.000Z\"`,
          params: {
            padding: 10,
          },
        },
      },
      timestamp_epoch: {
        script: {
          lang: 'painless',
          source: 'doc["timestamp"].value.getMillis()/1000',
        },
      },
      timestamp_iso8601: {
        script: {
          lang: 'painless',
          source: 'doc["timestamp"].value',
        },
      },
    };
  };

  /**
   * Builds an agg query based on the requested result type.
   * @param resultType
   * @param severity
   */
  const getResultTypeAggRequest = (resultType: AnomalyResultType, severity: number) => {
    const defaultSeverityThreshold = 3;

    return {
      influencer_results: {
        filter: {
          range: {
            influencer_score: {
              gte:
                resultType === ANOMALY_RESULT_TYPE.INFLUENCER ? severity : defaultSeverityThreshold,
            },
          },
        },
        aggs: {
          top_influencer_hits: {
            top_hits: {
              sort: [
                {
                  influencer_score: {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: [
                  'result_type',
                  'timestamp',
                  'influencer_field_name',
                  'influencer_field_value',
                  'influencer_score',
                  'is_interim',
                  'job_id',
                ],
              },
              size: 3,
              script_fields: {
                ...getCommonScriptedFields(),
                score: {
                  script: {
                    lang: 'painless',
                    source: 'Math.round(doc["influencer_score"].value)',
                  },
                },
                unique_key: {
                  script: {
                    lang: 'painless',
                    source:
                      'doc["timestamp"].value + "_" + doc["influencer_field_name"].value + "_" + doc["influencer_field_value"].value',
                  },
                },
              },
            },
          },
        },
      },
      record_results: {
        filter: {
          range: {
            record_score: {
              gte: resultType === ANOMALY_RESULT_TYPE.RECORD ? severity : defaultSeverityThreshold,
            },
          },
        },
        aggs: {
          top_record_hits: {
            top_hits: {
              sort: [
                {
                  record_score: {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: [
                  'result_type',
                  'timestamp',
                  'record_score',
                  'is_interim',
                  'function',
                  'field_name',
                  'by_field_value',
                  'over_field_value',
                  'partition_field_value',
                  'job_id',
                ],
              },
              size: 3,
              script_fields: {
                ...getCommonScriptedFields(),
                score: {
                  script: {
                    lang: 'painless',
                    source: 'Math.round(doc["record_score"].value)',
                  },
                },
                unique_key: {
                  script: {
                    lang: 'painless',
                    source:
                      'doc["timestamp"].value + "_" + doc["function"].value + "_" + doc["field_name"].value',
                  },
                },
              },
            },
          },
        },
      },
      bucket_results: {
        filter: {
          range: {
            anomaly_score: {
              gt: resultType === ANOMALY_RESULT_TYPE.BUCKET ? severity : defaultSeverityThreshold,
            },
          },
        },
        aggs: {
          top_bucket_hits: {
            top_hits: {
              sort: [
                {
                  anomaly_score: {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: ['job_id', 'result_type', 'timestamp', 'anomaly_score', 'is_interim'],
              },
              size: 1,
              script_fields: {
                ...getCommonScriptedFields(),
                score: {
                  script: {
                    lang: 'painless',
                    source: 'Math.round(doc["anomaly_score"].value)',
                  },
                },
                unique_key: {
                  script: {
                    lang: 'painless',
                    source: 'doc["timestamp"].value',
                  },
                },
              },
            },
          },
        },
      },
    };
  };

  /**
   * Builds a request body
   * @param params
   * @param previewTimeInterval
   */
  const fetchAnomalies = async (
    params: MlAnomalyDetectionAlertParams,
    previewTimeInterval?: string
  ): Promise<AlertExecutionResult[] | undefined> => {
    const jobAndGroupIds = [
      ...(params.jobSelection.jobIds ?? []),
      ...(params.jobSelection.groupIds ?? []),
    ];

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (await mlClient.getJobs({ job_id: jobAndGroupIds.join(',') })).body
      .jobs as Job[];

    if (jobsResponse.length === 0) {
      // Probably assigned groups don't contain any jobs anymore.
      return;
    }

    const lookBackTimeInterval = resolveTimeInterval(
      jobsResponse.map((v) => v.analysis_config.bucket_span)
    );

    const jobIds = jobsResponse.map((v) => v.job_id);

    const requestBody = {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: { job_id: jobIds },
            },
            {
              range: {
                timestamp: {
                  gte: `now-${previewTimeInterval ?? lookBackTimeInterval}`,
                },
              },
            },
            {
              terms: {
                result_type: Object.values(ANOMALY_RESULT_TYPE),
              },
            },
          ],
        },
      },
      aggs: {
        alerts_over_time: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: lookBackTimeInterval,
            // Ignore empty buckets
            min_doc_count: 1,
          },
          aggs: getResultTypeAggRequest(params.resultType as AnomalyResultType, params.severity),
        },
      },
    };

    const response = await mlClient.anomalySearch(
      {
        body: requestBody,
      },
      jobIds
    );

    const result = response.body.aggregations as {
      alerts_over_time: {
        buckets: Array<
          {
            doc_count: number;
            key: number;
            key_as_string: string;
          } & {
            [key in PreviewResultsKeys]: {
              doc_count: number;
            } & {
              [hitsKey in TopHitsResultsKeys]: {
                hits: { hits: any[] };
              };
            };
          }
        >;
      };
    };

    const resultsLabel = getAggResultsLabel(params.resultType as AnomalyResultType);

    return (
      result.alerts_over_time.buckets
        // Filter out empty buckets
        .filter((v) => v.doc_count > 0 && v[resultsLabel.aggGroupLabel].doc_count > 0)
        // Map response
        .map((v) => {
          const aggTypeResults = v[resultsLabel.aggGroupLabel];
          const requestedAnomalies = aggTypeResults[resultsLabel.topHitsLabel].hits.hits;

          return {
            count: aggTypeResults.doc_count,
            key: v.key,
            key_as_string: v.key_as_string,
            jobIds: [...new Set(requestedAnomalies.map((h) => h._source.job_id))],
            isInterim: requestedAnomalies.some((h) => h._source.is_interim),
            timestamp: requestedAnomalies[0]._source.timestamp,
            timestampIso8601: requestedAnomalies[0].fields.timestamp_iso8601[0],
            timestampEpoch: requestedAnomalies[0].fields.timestamp_epoch[0],
            score: requestedAnomalies[0].fields.score[0],
            bucketRange: {
              start: requestedAnomalies[0].fields.start[0],
              end: requestedAnomalies[0].fields.end[0],
            },
            topRecords: v.record_results.top_record_hits.hits.hits.map((h) => ({
              ...h._source,
              score: h.fields.score[0],
              unique_key: h.fields.unique_key[0],
            })) as RecordAnomalyAlertDoc[],
            topInfluencers: v.influencer_results.top_influencer_hits.hits.hits.map((h) => ({
              ...h._source,
              score: h.fields.score[0],
              unique_key: h.fields.unique_key[0],
            })) as InfluencerAnomalyAlertDoc[],
          };
        })
    );
  };

  /**
   * TODO Replace with URL generator when https://github.com/elastic/kibana/issues/59453 is resolved
   * @param r
   * @param type
   */
  const buildExplorerUrl = (r: AlertExecutionResult, type: AnomalyResultType): string => {
    const isInfluencerResult = type === ANOMALY_RESULT_TYPE.INFLUENCER;

    const globalState = {
      ml: {
        jobIds: r.jobIds,
      },
      time: {
        from: r.bucketRange.start,
        to: r.bucketRange.end,
      },
    };
    const appState = {
      explorer: {
        ...(isInfluencerResult
          ? {
              mlExplorerFilter: {
                filterActive: true,
                filteredFields: [
                  r.topInfluencers![0].influencer_field_name,
                  r.topInfluencers![0].influencer_field_value,
                ],
                influencersFilterQuery: {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match_phrase: {
                          [r.topInfluencers![0].influencer_field_name]: r.topInfluencers![0]
                            .influencer_field_value,
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {}),
        mlExplorerSwimlane: {
          selectedLanes: [
            isInfluencerResult ? r.topInfluencers![0].influencer_field_value : 'Overall',
          ],
          selectedTimes: [r.timestampEpoch],
          selectedType: isInfluencerResult ? 'viewBy' : 'overall',
          ...(isInfluencerResult
            ? { viewByFieldName: r.topInfluencers![0].influencer_field_name }
            : {}),
        },
      },
    };
    return `/app/ml/explorer/?_g=${rison.encode(globalState)}&_a=${rison.encode(appState)}`;
  };

  return {
    /**
     * Return the result of an alert condition execution.
     *
     * @param params
     */
    execute: async (
      params: MlAnomalyDetectionAlertParams
    ): Promise<AnomalyDetectionAlertContext | undefined> => {
      const res = await fetchAnomalies(params);

      if (!res) {
        throw new Error('No results found');
      }

      const result = res[0];
      if (!result) return;

      const anomalyExplorerUrl = buildExplorerUrl(result, params.resultType as AnomalyResultType);

      return {
        ...result,
        name: result.key_as_string,
        anomalyExplorerUrl,
      };
    },
    /**
     * Checks how often the alert condition will fire an alert instance
     * based on the provided relative time window.
     *
     * @param previewParams
     */
    preview: async ({
      alertParams,
      timeRange,
    }: MlAnomalyDetectionAlertPreviewRequest): Promise<PreviewResponse> => {
      const res = await fetchAnomalies(alertParams, timeRange);

      if (!res) {
        throw Boom.notFound(`No results found`);
      }

      return {
        // sum of all anomalies within the time range
        count: res.reduce((acc, curr) => acc + curr.count, 0),
        results: res,
      };
    },
  };
}

export type MlAlertingService = ReturnType<typeof alertingServiceProvider>;
