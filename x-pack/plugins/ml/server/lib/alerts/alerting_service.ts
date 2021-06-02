/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import rison from 'rison-node';
import { Duration } from 'moment/moment';
import { MlClient } from '../ml_client';
import {
  MlAnomalyDetectionAlertParams,
  MlAnomalyDetectionAlertPreviewRequest,
} from '../../routes/schemas/alerting_schema';
import { ANOMALY_RESULT_TYPE } from '../../../common/constants/anomalies';
import { AnomalyRecordDoc, AnomalyResultType } from '../../../common/types/anomalies';
import {
  AlertExecutionResult,
  InfluencerAnomalyAlertDoc,
  PreviewResponse,
  PreviewResultsKeys,
  RecordAnomalyAlertDoc,
  TopHitsResultsKeys,
} from '../../../common/types/alerts';
import { AnomalyDetectionAlertContext } from './register_anomaly_detection_alert_type';
import { MlJobsResponse } from '../../../common/types/job_service';
import { resolveMaxTimeInterval } from '../../../common/util/job_utils';
import { isDefined } from '../../../common/types/guards';
import { getTopNBuckets, resolveLookbackInterval } from '../../../common/util/alerts';
import type { DatafeedsService } from '../../models/job_service/datafeeds';
import { getEntityFieldName, getEntityFieldValue } from '../../../common/util/anomaly_utils';

type AggResultsResponse = { key?: number } & {
  [key in PreviewResultsKeys]: {
    doc_count: number;
  } & {
    [hitsKey in TopHitsResultsKeys]: {
      hits: { hits: any[] };
    };
  };
};

/**
 * Mapping for result types and corresponding score fields.
 */
const resultTypeScoreMapping = {
  [ANOMALY_RESULT_TYPE.BUCKET]: 'anomaly_score',
  [ANOMALY_RESULT_TYPE.RECORD]: 'record_score',
  [ANOMALY_RESULT_TYPE.INFLUENCER]: 'influencer_score',
};

/**
 * Alerting related server-side methods
 * @param mlClient
 * @param datafeedsService
 */
export function alertingServiceProvider(mlClient: MlClient, datafeedsService: DatafeedsService) {
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
  const getResultTypeAggRequest = (
    resultType: AnomalyResultType,
    severity: number,
    useInitialScore?: boolean
  ) => {
    const influencerScoreField = `${useInitialScore ? 'initial_' : ''}influencer_score`;
    const recordScoreField = `${useInitialScore ? 'initial_' : ''}record_score`;
    const bucketScoreField = `${useInitialScore ? 'initial_' : ''}anomaly_score`;

    return {
      influencer_results: {
        filter: {
          range: {
            [influencerScoreField]: {
              gte: resultType === ANOMALY_RESULT_TYPE.INFLUENCER ? severity : 0,
            },
          },
        },
        aggs: {
          top_influencer_hits: {
            top_hits: {
              sort: [
                {
                  [influencerScoreField]: {
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
                    source: `Math.floor(doc["${influencerScoreField}"].value)`,
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
            [recordScoreField]: {
              gte: resultType === ANOMALY_RESULT_TYPE.RECORD ? severity : 0,
            },
          },
        },
        aggs: {
          top_record_hits: {
            top_hits: {
              sort: [
                {
                  [recordScoreField]: {
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
                  'by_field_name',
                  'by_field_value',
                  'over_field_name',
                  'over_field_value',
                  'partition_field_name',
                  'partition_field_value',
                  'job_id',
                  'detector_index',
                ],
              },
              size: 3,
              script_fields: {
                ...getCommonScriptedFields(),
                score: {
                  script: {
                    lang: 'painless',
                    source: `Math.floor(doc["${recordScoreField}"].value)`,
                  },
                },
                unique_key: {
                  script: {
                    lang: 'painless',
                    source: 'doc["timestamp"].value + "_" + doc["function"].value',
                  },
                },
              },
            },
          },
        },
      },
      ...(resultType === ANOMALY_RESULT_TYPE.BUCKET
        ? {
            bucket_results: {
              filter: {
                range: {
                  [bucketScoreField]: {
                    gt: severity,
                  },
                },
              },
              aggs: {
                top_bucket_hits: {
                  top_hits: {
                    sort: [
                      {
                        [bucketScoreField]: {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: {
                      includes: [
                        'job_id',
                        'result_type',
                        'timestamp',
                        'anomaly_score',
                        'is_interim',
                      ],
                    },
                    size: 1,
                    script_fields: {
                      ...getCommonScriptedFields(),
                      score: {
                        script: {
                          lang: 'painless',
                          source: `Math.floor(doc["${bucketScoreField}"].value)`,
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
          }
        : {}),
    };
  };

  /**
   * Provides a key for alert instance.
   */
  const getAlertInstanceKey = (source: AnomalyRecordDoc): string => {
    return source.job_id;
  };

  const getRecordKey = (source: AnomalyRecordDoc): string => {
    let alertInstanceKey = `${source.job_id}_${source.timestamp}`;

    const fieldName = getEntityFieldName(source);
    const fieldValue = getEntityFieldValue(source);
    const entity =
      fieldName !== undefined && fieldValue !== undefined ? `_${fieldName}_${fieldValue}` : '';
    alertInstanceKey += `_${source.detector_index}_${source.function}${entity}`;

    return alertInstanceKey;
  };

  const getResultsFormatter = (resultType: AnomalyResultType) => {
    const resultsLabel = getAggResultsLabel(resultType);
    return (v: AggResultsResponse): AlertExecutionResult | undefined => {
      const aggTypeResults = v[resultsLabel.aggGroupLabel];
      if (aggTypeResults.doc_count === 0) {
        return;
      }

      const requestedAnomalies = aggTypeResults[resultsLabel.topHitsLabel].hits.hits;

      const topAnomaly = requestedAnomalies[0];
      const alertInstanceKey = getAlertInstanceKey(topAnomaly._source);

      return {
        count: aggTypeResults.doc_count,
        key: v.key,
        message:
          'Alerts are raised based on real-time scores. Remember that scores may be adjusted over time as data continues to be analyzed.',
        alertInstanceKey,
        jobIds: [...new Set(requestedAnomalies.map((h) => h._source.job_id))],
        isInterim: requestedAnomalies.some((h) => h._source.is_interim),
        timestamp: topAnomaly._source.timestamp,
        timestampIso8601: topAnomaly.fields.timestamp_iso8601[0],
        timestampEpoch: topAnomaly.fields.timestamp_epoch[0],
        score: topAnomaly.fields.score[0],
        bucketRange: {
          start: topAnomaly.fields.start[0],
          end: topAnomaly.fields.end[0],
        },
        topRecords: v.record_results.top_record_hits.hits.hits.map((h) => {
          return {
            ...h._source,
            score: h.fields.score[0],
            unique_key: getRecordKey(h._source),
          };
        }) as RecordAnomalyAlertDoc[],
        topInfluencers: v.influencer_results.top_influencer_hits.hits.hits.map((h) => {
          return {
            ...h._source,
            score: h.fields.score[0],
            unique_key: h.fields.unique_key[0],
          };
        }) as InfluencerAnomalyAlertDoc[],
      };
    };
  };

  /**
   * Builds a request body
   * @param params - Alert params
   * @param previewTimeInterval - Relative time interval to test the alert condition
   * @param checkIntervalGap - Interval between alert executions
   */
  const fetchAnomalies = async (
    params: MlAnomalyDetectionAlertParams,
    previewTimeInterval?: string,
    checkIntervalGap?: Duration
  ): Promise<AlertExecutionResult[] | undefined> => {
    const jobAndGroupIds = [
      ...(params.jobSelection.jobIds ?? []),
      ...(params.jobSelection.groupIds ?? []),
    ];

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (
      await mlClient.getJobs<MlJobsResponse>({ job_id: jobAndGroupIds.join(',') })
    ).body.jobs;

    if (jobsResponse.length === 0) {
      // Probably assigned groups don't contain any jobs anymore.
      throw new Error("Couldn't find the job with provided id");
    }

    const maxBucket = resolveMaxTimeInterval(
      jobsResponse.map((v) => v.analysis_config.bucket_span)
    );

    if (maxBucket === undefined) {
      // Technically it's not possible, just in case.
      throw new Error('Unable to resolve a valid bucket length');
    }

    /**
     * The check interval might be bigger than the 2x bucket span.
     * We need to check the biggest time range to make sure anomalies are not missed.
     */
    const lookBackTimeInterval = `${Math.max(
      // Double the max bucket span
      Math.round(maxBucket * 2),
      checkIntervalGap ? Math.round(checkIntervalGap.asSeconds()) : 0
    )}s`;

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
                  // Restricts data points to the current moment for preview
                  ...(previewTimeInterval ? { lte: 'now' } : {}),
                },
              },
            },
            {
              terms: {
                result_type: Object.values(ANOMALY_RESULT_TYPE) as string[],
              },
            },
            ...(params.includeInterim
              ? []
              : [
                  {
                    term: { is_interim: false },
                  },
                ]),
          ],
        },
      },
      aggs: previewTimeInterval
        ? {
            alerts_over_time: {
              date_histogram: {
                field: 'timestamp',
                fixed_interval: `${maxBucket}s`,
                // Ignore empty buckets
                min_doc_count: 1,
              },
              aggs: getResultTypeAggRequest(params.resultType, params.severity, true),
            },
          }
        : getResultTypeAggRequest(params.resultType, params.severity),
    };

    const response = await mlClient.anomalySearch(
      {
        // @ts-expect-error
        body: requestBody,
      },
      jobIds
    );

    const result = response.body.aggregations;

    const resultsLabel = getAggResultsLabel(params.resultType);

    const formatter = getResultsFormatter(params.resultType);

    return (previewTimeInterval
      ? (result as {
          alerts_over_time: {
            buckets: Array<
              {
                doc_count: number;
                key: number;
                key_as_string: string;
              } & AggResultsResponse
            >;
          };
        }).alerts_over_time.buckets
          // Filter out empty buckets
          .filter((v) => v.doc_count > 0 && v[resultsLabel.aggGroupLabel].doc_count > 0)
          // Map response
          .map(formatter)
      : // @ts-expect-error
        [formatter(result as AggResultsResponse)]
    ).filter(isDefined);
  };

  /**
   * Fetches the most recent anomaly according the top N buckets within the lookback interval
   * that satisfies a rule criteria.
   *
   * @param params - Alert params
   */
  const fetchResult = async (
    params: MlAnomalyDetectionAlertParams
  ): Promise<AlertExecutionResult | undefined> => {
    const jobAndGroupIds = [
      ...(params.jobSelection.jobIds ?? []),
      ...(params.jobSelection.groupIds ?? []),
    ];

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (
      await mlClient.getJobs<MlJobsResponse>({ job_id: jobAndGroupIds.join(',') })
    ).body.jobs;

    if (jobsResponse.length === 0) {
      // Probably assigned groups don't contain any jobs anymore.
      return;
    }

    const jobIds = jobsResponse.map((v) => v.job_id);

    const dataFeeds = await datafeedsService.getDatafeedByJobId(jobIds);

    const maxBucketInSeconds = resolveMaxTimeInterval(
      jobsResponse.map((v) => v.analysis_config.bucket_span)
    );

    if (maxBucketInSeconds === undefined) {
      // Technically it's not possible, just in case.
      throw new Error('Unable to resolve a valid bucket length');
    }

    const lookBackTimeInterval: string =
      params.lookbackInterval ?? resolveLookbackInterval(jobsResponse, dataFeeds ?? []);

    const topNBuckets: number = params.topNBuckets ?? getTopNBuckets(jobsResponse[0]);

    const requestBody = {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: { job_id: jobIds },
            },
            {
              terms: {
                result_type: Object.values(ANOMALY_RESULT_TYPE) as string[],
              },
            },
            {
              range: {
                timestamp: {
                  gte: `now-${lookBackTimeInterval}`,
                },
              },
            },
            ...(params.includeInterim
              ? []
              : [
                  {
                    term: { is_interim: false },
                  },
                ]),
          ],
        },
      },
      aggs: {
        alerts_over_time: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: `${maxBucketInSeconds}s`,
            order: {
              _key: 'desc' as const,
            },
          },
          aggs: {
            max_score: {
              max: {
                field: resultTypeScoreMapping[params.resultType],
              },
            },
            ...getResultTypeAggRequest(params.resultType, params.severity),
            truncate: {
              bucket_sort: {
                size: topNBuckets,
              },
            },
          },
        },
      },
    };

    const response = await mlClient.anomalySearch(
      {
        // @ts-expect-error
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
            max_score: {
              value: number;
            };
          } & AggResultsResponse
        >;
      };
    };

    if (result.alerts_over_time.buckets.length === 0) {
      return;
    }

    // Find the most anomalous result from the top N buckets
    const topResult = result.alerts_over_time.buckets.reduce((prev, current) =>
      prev.max_score.value > current.max_score.value ? prev : current
    );

    return getResultsFormatter(params.resultType)(topResult);
  };

  /**
   * TODO Replace with URL generator when https://github.com/elastic/kibana/issues/59453 is resolved
   * @param r
   * @param type
   */
  const buildExplorerUrl = (r: AlertExecutionResult, type: AnomalyResultType): string => {
    const isInfluencerResult = type === ANOMALY_RESULT_TYPE.INFLUENCER;

    /**
     * Disabled until Anomaly Explorer page is fixed and properly
     * support single point time selection
     */
    const highlightSwimLaneSelection = false;

    const globalState = {
      ml: {
        jobIds: r.jobIds,
      },
      time: {
        from: r.bucketRange.start,
        to: r.bucketRange.end,
        mode: 'absolute',
      },
    };

    const appState = {
      explorer: {
        mlExplorerFilter: {
          ...(isInfluencerResult
            ? {
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
                queryString: `${r.topInfluencers![0].influencer_field_name}:"${
                  r.topInfluencers![0].influencer_field_value
                }"`,
              }
            : {}),
        },
        mlExplorerSwimlane: {
          ...(highlightSwimLaneSelection
            ? {
                selectedLanes: [
                  isInfluencerResult ? r.topInfluencers![0].influencer_field_value : 'Overall',
                ],
                selectedTimes: r.timestampEpoch,
                selectedType: isInfluencerResult ? 'viewBy' : 'overall',
                ...(isInfluencerResult
                  ? { viewByFieldName: r.topInfluencers![0].influencer_field_name }
                  : {}),
                ...(isInfluencerResult ? {} : { showTopFieldValues: true }),
              }
            : {}),
        },
      },
    };
    return `/app/ml/explorer/?_g=${encodeURIComponent(
      rison.encode(globalState)
    )}&_a=${encodeURIComponent(rison.encode(appState))}`;
  };

  return {
    /**
     * Return the result of an alert condition execution.
     *
     * @param params - Alert params
     * @param startedAt
     * @param previousStartedAt
     */
    execute: async (
      params: MlAnomalyDetectionAlertParams,
      startedAt: Date,
      previousStartedAt: Date | null
    ): Promise<AnomalyDetectionAlertContext | undefined> => {
      const result = await fetchResult(params);

      if (!result) return;

      const anomalyExplorerUrl = buildExplorerUrl(result, params.resultType);

      const executionResult = {
        ...result,
        name: result.alertInstanceKey,
        anomalyExplorerUrl,
      };

      return executionResult;
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
      sampleSize,
    }: MlAnomalyDetectionAlertPreviewRequest): Promise<PreviewResponse> => {
      const res = await fetchAnomalies(alertParams, timeRange);

      if (!res) {
        throw Boom.notFound(`No results found`);
      }

      return {
        // sum of all alert responses within the time range
        count: res.length,
        results: res.slice(0, sampleSize),
      };
    },
  };
}

export type MlAlertingService = ReturnType<typeof alertingServiceProvider>;
