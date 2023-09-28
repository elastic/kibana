/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import rison from '@kbn/rison';
import type { Duration } from 'moment/moment';
import { memoize, pick } from 'lodash';
import {
  FIELD_FORMAT_IDS,
  type IFieldFormat,
  type SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { isDefined } from '@kbn/ml-is-defined';
import {
  getEntityFieldName,
  getEntityFieldValue,
  type MlAnomalyRecordDoc,
  type MlAnomalyResultType,
  ML_ANOMALY_RESULT_TYPE,
} from '@kbn/ml-anomaly-utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';
import type { MlClient } from '../ml_client';
import type {
  MlAnomalyDetectionAlertParams,
  MlAnomalyDetectionAlertPreviewRequest,
} from '../../routes/schemas/alerting_schema';
import type {
  AlertExecutionResult,
  InfluencerAnomalyAlertDoc,
  PreviewResponse,
  PreviewResultsKeys,
  RecordAnomalyAlertDoc,
  TopHitsResultsKeys,
  TopInfluencerAADDoc,
  TopRecordAADDoc,
} from '../../../common/types/alerts';
import type {
  AnomalyDetectionAlertContext,
  AnomalyDetectionAlertPayload,
} from './register_anomaly_detection_alert_type';
import { resolveMaxTimeInterval } from '../../../common/util/job_utils';
import { getTopNBuckets, resolveLookbackInterval } from '../../../common/util/alerts';
import type { DatafeedsService } from '../../models/job_service/datafeeds';
import type { FieldFormatsRegistryProvider } from '../../../common/types/kibana';
import type { AwaitReturnType } from '../../../common/types/common';
import { getTypicalAndActualValues } from '../../models/results_service/results_service';
import type { GetDataViewsService } from '../data_views_utils';

type AggResultsResponse = { key?: number } & {
  [key in PreviewResultsKeys]: {
    doc_count: number;
  } & {
    [hitsKey in TopHitsResultsKeys]: {
      hits: { hits: any[] };
    };
  };
};

interface AnomalyESQueryParams {
  resultType: MlAnomalyResultType;
  /** Appropriate score field for requested result type. */
  anomalyScoreField: string;
  anomalyScoreThreshold: number;
  jobIds: string[];
  topNBuckets: number;
  maxBucketInSeconds: number;
  lookBackTimeInterval: string;
  includeInterimResults: boolean;
  /** Source index from the datafeed. Required for retrieving field types for formatting results. */
  indexPattern: string;
}

const TIME_RANGE_PADDING = 10;

/**
 * TODO Replace with URL generator when https://github.com/elastic/kibana/issues/59453 is resolved
 */
export function buildExplorerUrl(
  jobIds: string[],
  timeRange: { from: string; to: string; mode?: string },
  type: MlAnomalyResultType,
  spaceId: string,
  r?: AlertExecutionResult
): string {
  const isInfluencerResult = type === ML_ANOMALY_RESULT_TYPE.INFLUENCER;

  /**
   * Disabled until Anomaly Explorer page is fixed and properly
   * support single point time selection
   */
  const highlightSwimLaneSelection = false;

  const globalState = {
    ml: {
      jobIds,
    },
    time: {
      from: timeRange.from,
      to: timeRange.to,
      mode: timeRange.mode ?? 'absolute',
    },
  };

  const appState = {
    explorer: {
      mlExplorerFilter: {
        ...(r && isInfluencerResult
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
                        [r.topInfluencers![0].influencer_field_name]:
                          r.topInfluencers![0].influencer_field_value,
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
        ...(r && highlightSwimLaneSelection
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

  const spacePathComponent: string =
    !spaceId || spaceId === DEFAULT_SPACE_ID ? '' : `/s/${spaceId}`;

  return `${spacePathComponent}/app/ml/explorer/?_g=${encodeURIComponent(
    rison.encode(globalState)
  )}&_a=${encodeURIComponent(rison.encode(appState))}`;
}

/**
 * Mapping for result types and corresponding score fields.
 */
const resultTypeScoreMapping = {
  [ML_ANOMALY_RESULT_TYPE.BUCKET]: 'anomaly_score',
  [ML_ANOMALY_RESULT_TYPE.RECORD]: 'record_score',
  [ML_ANOMALY_RESULT_TYPE.INFLUENCER]: 'influencer_score',
};

/**
 * Alerting related server-side methods
 * @param mlClient
 * @param datafeedsService
 */
export function alertingServiceProvider(
  mlClient: MlClient,
  datafeedsService: DatafeedsService,
  getFieldsFormatRegistry: FieldFormatsRegistryProvider,
  getDataViewsService: GetDataViewsService
) {
  type FieldFormatters = AwaitReturnType<ReturnType<typeof getFormatters>>;

  /**
   * Provides formatters based on the data view of the datafeed index pattern
   * and set of default formatters for fallback.
   */
  const getFormatters = memoize(async (indexPattern: string) => {
    const fieldFormatsRegistry = await getFieldsFormatRegistry();
    const numberFormatter = fieldFormatsRegistry.deserialize({ id: FIELD_FORMAT_IDS.NUMBER });

    const fieldFormatMap = await getFieldsFormatMap(indexPattern);

    const fieldFormatters = fieldFormatMap
      ? Object.entries(fieldFormatMap).reduce((acc, [fieldName, config]) => {
          const formatter = fieldFormatsRegistry.deserialize(config);
          acc[fieldName] = formatter.convert.bind(formatter);
          return acc;
        }, {} as Record<string, IFieldFormat['convert']>)
      : {};

    return {
      numberFormatter: numberFormatter.convert.bind(numberFormatter),
      fieldFormatters,
    };
  });

  /**
   * Attempts to find a data view based on the index pattern
   */
  const getFieldsFormatMap = memoize(
    async (indexPattern: string): Promise<Record<string, SerializedFieldFormat> | undefined> => {
      try {
        const dataViewsService = await getDataViewsService();

        const dataViews = await dataViewsService.find(indexPattern);
        const dataView = dataViews.find(({ title }) => title === indexPattern);

        if (!dataView) return;

        return dataView.fieldFormatMap;
      } catch (e) {
        return;
      }
    }
  );

  const getAggResultsLabel = (resultType: MlAnomalyResultType) => {
    return {
      aggGroupLabel: `${resultType}_results` as PreviewResultsKeys,
      topHitsLabel: `top_${resultType}_hits` as TopHitsResultsKeys,
    };
  };

  /**
   * Builds an agg query based on the requested result type.
   * @param resultType
   * @param severity
   */
  const getResultTypeAggRequest = (
    resultType: MlAnomalyResultType,
    severity: number,
    useInitialScore?: boolean
  ) => {
    const influencerScoreField = getScoreFields(ML_ANOMALY_RESULT_TYPE.INFLUENCER, useInitialScore);
    const recordScoreField = getScoreFields(ML_ANOMALY_RESULT_TYPE.RECORD, useInitialScore);
    const bucketScoreField = getScoreFields(ML_ANOMALY_RESULT_TYPE.BUCKET, useInitialScore);

    return {
      influencer_results: {
        filter: {
          range: {
            [influencerScoreField]: {
              gte: resultType === ML_ANOMALY_RESULT_TYPE.INFLUENCER ? severity : 0,
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
                  'initial_influencer_score',
                  'is_interim',
                  'job_id',
                  'bucket_span',
                ],
              },
              size: 3,
            },
          },
        },
      },
      record_results: {
        filter: {
          range: {
            [recordScoreField]: {
              gte: resultType === ML_ANOMALY_RESULT_TYPE.RECORD ? severity : 0,
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
                  'initial_record_score',
                  'is_interim',
                  'function',
                  'function_description',
                  'field_name',
                  'by_field_name',
                  'by_field_value',
                  'over_field_name',
                  'over_field_value',
                  'partition_field_name',
                  'partition_field_value',
                  'job_id',
                  'detector_index',
                  'bucket_span',
                  'typical',
                  'actual',
                  'causes',
                ],
              },
              size: 3,
            },
          },
        },
      },
      ...(resultType === ML_ANOMALY_RESULT_TYPE.BUCKET
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
                        'initial_anomaly_score',
                        'is_interim',
                        'bucket_span',
                      ],
                    },
                    size: 1,
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
  const getAlertInstanceKey = (source: MlAnomalyRecordDoc): string => {
    return source.job_id;
  };

  const getScoreFields = (resultType: MlAnomalyResultType, useInitialScore?: boolean) => {
    return `${useInitialScore ? 'initial_' : ''}${resultTypeScoreMapping[resultType]}`;
  };

  const getRecordKey = (source: MlAnomalyRecordDoc): string => {
    let alertInstanceKey = `${source.job_id}_${source.timestamp}`;

    const fieldName = getEntityFieldName(source);
    const fieldValue = getEntityFieldValue(source);
    const entity =
      fieldName !== undefined && fieldValue !== undefined ? `_${fieldName}_${fieldValue}` : '';
    alertInstanceKey += `_${source.detector_index}_${source.function}${entity}`;

    return alertInstanceKey;
  };

  /**
   * Returns a callback for formatting elasticsearch aggregation response
   * to the alert-as-data document.
   * @param resultType
   */
  const getResultsToPayloadFormatter = (
    resultType: MlAnomalyResultType,
    useInitialScore: boolean = false
  ) => {
    const resultsLabel = getAggResultsLabel(resultType);

    return (
      v: AggResultsResponse
    ): Omit<AnomalyDetectionAlertPayload, typeof ALERT_URL> | undefined => {
      const aggTypeResults = v[resultsLabel.aggGroupLabel];
      if (aggTypeResults.doc_count === 0) {
        return;
      }
      const requestedAnomalies = aggTypeResults[resultsLabel.topHitsLabel].hits.hits;
      const topAnomaly = requestedAnomalies[0];
      const timestamp = topAnomaly._source.timestamp;

      return {
        [ALERT_REASON]: i18n.translate(
          'xpack.ml.alertTypes.anomalyDetectionAlertingRule.alertMessage',
          {
            defaultMessage:
              'Alerts are raised based on real-time scores. Remember that scores may be adjusted over time as data continues to be analyzed.',
          }
        ),
        job_id: [...new Set(requestedAnomalies.map((h) => h._source.job_id))][0],
        is_interim: requestedAnomalies.some((h) => h._source.is_interim),
        anomaly_timestamp: timestamp,
        anomaly_score: topAnomaly._source[getScoreFields(resultType, useInitialScore)],
        top_records: v.record_results.top_record_hits.hits.hits.map((h) => {
          const { actual, typical } = getTypicalAndActualValues(h._source);
          return pick<RecordAnomalyAlertDoc>(
            {
              ...h._source,
              typical,
              actual,
            },
            [
              'job_id',
              'record_score',
              'initial_record_score',
              'detector_index',
              'is_interim',
              'timestamp',
              'partition_field_name',
              'partition_field_value',
              'function',
              'actual',
              'typical',
            ]
          ) as TopRecordAADDoc;
        }) as TopRecordAADDoc[],
        top_influencers: v.influencer_results.top_influencer_hits.hits.hits.map((influencerDoc) => {
          return pick<InfluencerAnomalyAlertDoc>(
            {
              ...influencerDoc._source,
            },
            [
              'job_id',
              'influencer_field_name',
              'influencer_field_value',
              'influencer_score',
              'initial_influencer_score',
              'is_interim',
              'timestamp',
            ]
          ) as TopInfluencerAADDoc;
        }) as TopInfluencerAADDoc[],
      };
    };
  };

  /**
   * Returns a callback for formatting elasticsearch aggregation response
   * to the alert context.
   * @param resultType
   */
  const getResultsToContextFormatter = (
    resultType: MlAnomalyResultType,
    useInitialScore: boolean = false,
    formatters: FieldFormatters
  ) => {
    const resultsLabel = getAggResultsLabel(resultType);
    return (v: AggResultsResponse): AlertExecutionResult | undefined => {
      const aggTypeResults = v[resultsLabel.aggGroupLabel];
      if (aggTypeResults.doc_count === 0) {
        return;
      }
      const requestedAnomalies = aggTypeResults[resultsLabel.topHitsLabel].hits.hits;
      const topAnomaly = requestedAnomalies[0];
      const alertInstanceKey = getAlertInstanceKey(topAnomaly._source);
      const timestamp = topAnomaly._source.timestamp;
      const bucketSpanInSeconds = topAnomaly._source.bucket_span;

      return {
        count: aggTypeResults.doc_count,
        key: v.key,
        message: i18n.translate('xpack.ml.alertTypes.anomalyDetectionAlertingRule.alertMessage', {
          defaultMessage:
            'Alerts are raised based on real-time scores. Remember that scores may be adjusted over time as data continues to be analyzed.',
        }),
        alertInstanceKey,
        jobIds: [...new Set(requestedAnomalies.map((h) => h._source.job_id))],
        isInterim: requestedAnomalies.some((h) => h._source.is_interim),
        timestamp,
        timestampIso8601: new Date(timestamp).toISOString(),
        timestampEpoch: timestamp / 1000,
        score: Math.floor(topAnomaly._source[getScoreFields(resultType, useInitialScore)]),
        bucketRange: {
          start: new Date(
            timestamp - bucketSpanInSeconds * 1000 * TIME_RANGE_PADDING
          ).toISOString(),
          end: new Date(timestamp + bucketSpanInSeconds * 1000 * TIME_RANGE_PADDING).toISOString(),
        },
        topRecords: v.record_results.top_record_hits.hits.hits.map((h) => {
          const { actual, typical } = getTypicalAndActualValues(h._source);

          const formatter =
            formatters.fieldFormatters[h._source.field_name] ?? formatters.numberFormatter;

          return {
            ...h._source,
            typical: typical?.map((t) => formatter(t)),
            actual: actual?.map((a) => formatter(a)),
            score: Math.floor(
              h._source[getScoreFields(ML_ANOMALY_RESULT_TYPE.RECORD, useInitialScore)]
            ),
            unique_key: getRecordKey(h._source),
          };
        }) as RecordAnomalyAlertDoc[],
        topInfluencers: v.influencer_results.top_influencer_hits.hits.hits.map((h) => {
          return {
            ...h._source,
            score: Math.floor(
              h._source[getScoreFields(ML_ANOMALY_RESULT_TYPE.INFLUENCER, useInitialScore)]
            ),
            unique_key: `${h._source.timestamp}_${h._source.influencer_field_name}_${h._source.influencer_field_value}`,
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
  const fetchPreviewResults = async (
    params: MlAnomalyDetectionAlertParams,
    previewTimeInterval?: string,
    checkIntervalGap?: Duration
  ): Promise<AlertExecutionResult[] | undefined> => {
    const jobAndGroupIds = [
      ...(params.jobSelection.jobIds ?? []),
      ...(params.jobSelection.groupIds ?? []),
    ];

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (await mlClient.getJobs({ job_id: jobAndGroupIds.join(',') })).jobs;

    if (jobsResponse.length === 0) {
      // Probably assigned groups don't contain any jobs anymore.
      throw new Error("Couldn't find the job with provided id");
    }

    const maxBucket = resolveMaxTimeInterval(
      jobsResponse.map((v) => v.analysis_config.bucket_span!)
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

    const datafeeds = await datafeedsService.getDatafeedByJobId(jobIds);

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
                result_type: Object.values(ML_ANOMALY_RESULT_TYPE) as string[],
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

    const body = await mlClient.anomalySearch(
      {
        // @ts-expect-error
        body: requestBody,
      },
      jobIds
    );

    const result = body.aggregations;

    const resultsLabel = getAggResultsLabel(params.resultType);

    const fieldsFormatters = await getFormatters(datafeeds![0]!.indices[0]);

    const formatter = getResultsToContextFormatter(
      params.resultType,
      !!previewTimeInterval,
      fieldsFormatters
    );

    return (
      previewTimeInterval
        ? (
            result as {
              alerts_over_time: {
                buckets: Array<
                  {
                    doc_count: number;
                    key: number;
                    key_as_string: string;
                  } & AggResultsResponse
                >;
              };
            }
          ).alerts_over_time.buckets
            // Filter out empty buckets
            .filter((v) => v.doc_count > 0 && v[resultsLabel.aggGroupLabel].doc_count > 0)
            // Map response
            .map(formatter)
        : [formatter(result as unknown as AggResultsResponse)]
    ).filter(isDefined);
  };

  /**
   * Gets ES query params for fetching anomalies.
   *
   * @param params {MlAnomalyDetectionAlertParams}
   * @return Params required for performing ES query for anomalies.
   */
  const getQueryParams = async (
    params: MlAnomalyDetectionAlertParams
  ): Promise<AnomalyESQueryParams | void> => {
    const jobAndGroupIds = [
      ...(params.jobSelection.jobIds ?? []),
      ...(params.jobSelection.groupIds ?? []),
    ];

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (await mlClient.getJobs({ job_id: jobAndGroupIds.join(',') })).jobs;

    if (jobsResponse.length === 0) {
      // Probably assigned groups don't contain any jobs anymore.
      return;
    }

    const jobIds = jobsResponse.map((v) => v.job_id);

    const datafeeds = await datafeedsService.getDatafeedByJobId(jobIds);

    const maxBucketInSeconds = resolveMaxTimeInterval(
      jobsResponse.map((v) => v.analysis_config.bucket_span!)
    );

    if (maxBucketInSeconds === undefined) {
      // Technically it's not possible, just in case.
      throw new Error('Unable to resolve a valid bucket length');
    }

    const lookBackTimeInterval: string =
      params.lookbackInterval ?? resolveLookbackInterval(jobsResponse, datafeeds ?? []);

    const topNBuckets: number = params.topNBuckets ?? getTopNBuckets(jobsResponse[0]);

    return {
      jobIds,
      topNBuckets,
      maxBucketInSeconds,
      lookBackTimeInterval,
      anomalyScoreField: resultTypeScoreMapping[params.resultType],
      includeInterimResults: params.includeInterim,
      resultType: params.resultType,
      indexPattern: datafeeds![0]!.indices[0],
      anomalyScoreThreshold: params.severity,
    };
  };

  /**
   * Fetches the most recent anomaly according the top N buckets within the lookback interval
   * that satisfies a rule criteria.
   *
   * @param params - Alert params
   */
  const fetchResult = async (
    params: AnomalyESQueryParams
  ): Promise<AggResultsResponse | undefined> => {
    const {
      resultType,
      jobIds,
      maxBucketInSeconds,
      topNBuckets,
      lookBackTimeInterval,
      anomalyScoreField,
      includeInterimResults,
      anomalyScoreThreshold,
    } = params;

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
                result_type: Object.values(ML_ANOMALY_RESULT_TYPE) as string[],
              },
            },
            {
              range: {
                timestamp: {
                  gte: `now-${lookBackTimeInterval}`,
                },
              },
            },
            ...(includeInterimResults
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
                field: anomalyScoreField,
              },
            },
            ...getResultTypeAggRequest(resultType, anomalyScoreThreshold),
            truncate: {
              bucket_sort: {
                size: topNBuckets,
              },
            },
          },
        },
      },
    };

    const body = await mlClient.anomalySearch(
      {
        // @ts-expect-error
        body: requestBody,
      },
      jobIds
    );

    const result = body.aggregations as {
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

    return topResult;
  };

  const getFormatted = async (
    indexPattern: string,
    resultType: MlAnomalyDetectionAlertParams['resultType'],
    spaceId: string,
    value: AggResultsResponse
  ): Promise<
    | { payload: AnomalyDetectionAlertPayload; context: AnomalyDetectionAlertContext; name: string }
    | undefined
  > => {
    const formatters = await getFormatters(indexPattern);

    const context = getResultsToContextFormatter(resultType, false, formatters)(value);
    const payload = getResultsToPayloadFormatter(resultType, false)(value);

    if (!context || !payload) return;

    const anomalyExplorerUrl = buildExplorerUrl(
      context.jobIds,
      { from: context.bucketRange.start, to: context.bucketRange.end },
      resultType,
      spaceId,
      context
    );

    return {
      payload: {
        ...payload,
        [ALERT_URL]: anomalyExplorerUrl,
      },
      context: {
        ...context,
        anomalyExplorerUrl,
      },
      name: context.alertInstanceKey,
    };
  };

  return {
    /**
     * Return the result of an alert condition execution.
     *
     * @param params - Alert params
     * @param spaceId
     */
    execute: async (
      params: MlAnomalyDetectionAlertParams,
      spaceId: string
    ): Promise<
      | {
          payload: AnomalyDetectionAlertPayload;
          context: AnomalyDetectionAlertContext;
          name: string;
          isHealthy: boolean;
        }
      | undefined
    > => {
      const queryParams = await getQueryParams(params);

      if (!queryParams) {
        return;
      }

      const result = await fetchResult(queryParams);

      const formattedResult = result
        ? await getFormatted(queryParams.indexPattern, queryParams.resultType, spaceId, result)
        : undefined;

      if (!formattedResult) {
        // If no anomalies found, report as recovered.

        const url = buildExplorerUrl(
          queryParams.jobIds,
          {
            from: `now-${queryParams.lookBackTimeInterval}`,
            to: 'now',
            mode: 'relative',
          },
          queryParams.resultType,
          spaceId
        );

        const message = i18n.translate(
          'xpack.ml.alertTypes.anomalyDetectionAlertingRule.recoveredMessage',
          {
            defaultMessage:
              'No anomalies have been found in the past {lookbackInterval} that exceed the severity threshold of {severity}.',
            values: {
              severity: queryParams.anomalyScoreThreshold,
              lookbackInterval: queryParams.lookBackTimeInterval,
            },
          }
        );

        return {
          name: '',
          isHealthy: true,
          payload: {
            [ALERT_URL]: url,
            [ALERT_REASON]: message,
            job_id: queryParams.jobIds[0],
          },
          context: {
            anomalyExplorerUrl: url,
            jobIds: queryParams.jobIds,
            message,
          } as AnomalyDetectionAlertContext,
        };
      }

      return {
        context: formattedResult.context,
        payload: formattedResult.payload,
        name: formattedResult.name,
        isHealthy: false,
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
      sampleSize,
    }: MlAnomalyDetectionAlertPreviewRequest): Promise<PreviewResponse> => {
      const previewResults = await fetchPreviewResults(alertParams, timeRange);

      if (!previewResults) {
        throw Boom.notFound(`No results found`);
      }

      return {
        // sum of all alert responses within the time range
        count: previewResults.length,
        results: previewResults.slice(0, sampleSize),
      };
    },
  };
}

export type MlAlertingService = ReturnType<typeof alertingServiceProvider>;
