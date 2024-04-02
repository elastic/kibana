/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';
import { FromSchema } from 'json-schema-to-ts';
import { mean } from 'd3-array';
import moment from 'moment';
import rison from '@kbn/rison';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { type SignificantItem } from '@kbn/ml-agg-utils';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import {
  getExtendedChangePoint,
  getWindowParametersForTrigger,
} from '@kbn/aiops-log-rate-analysis';
import { fetchIndexInfo } from '@kbn/aiops-log-rate-analysis/queries/fetch_index_info';
import type { AiopsLogRateAnalysisSchema } from '@kbn/aiops-log-rate-analysis/api/schema';
import { fetchSignificantCategories } from '@kbn/aiops-log-rate-analysis/queries/fetch_significant_categories';
import { fetchSignificantTermPValues } from '@kbn/aiops-log-rate-analysis/queries/fetch_significant_term_p_values';
import { getSampleProbability } from '@kbn/ml-random-sampler-utils';

import { FunctionRegistrationParameters } from '.';
// import { ApmTimeseries, getApmTimeseries } from '../routes/assistant_functions/get_apm_timeseries';

// Don't use more than 10 here otherwise Kibana will emit an error
// regarding a limit of abort signal listeners of more than 10.
export const MAX_CONCURRENT_QUERIES = 5;

export const NON_EMPTY_STRING = {
  type: 'string' as const,
  minLength: 1,
};

const parameters = {
  type: 'object',
  properties: {
    index: {
      type: 'string',
      description: 'The Elasticsearch source index pattern.',
    },
    dataViewId: {
      type: 'string',
      description: 'The Kibana data view id.',
    },
    timefield: {
      type: 'string',
      description: 'The Elasticesarch source index pattern time field.',
    },
    start: {
      type: 'string',
      description: 'The start of the time range, in Elasticsearch date math, like `now`.',
    },
    end: {
      type: 'string',
      description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
    },
  },
  required: ['dataViewId', 'index', 'timefield', 'start', 'end'],
} as const;

export function registerGetAiopsLogRateAnalysisFunction({
  apmEventClient,
  resources,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      contexts: ['aiops'],
      name: 'get_aiops_log_rate_analysis',
      descriptionForUser: i18n.translate(
        'xpack.aiops.observabilityAiAssistant.functions.registerGetAiopsLogRateAnalyssi.descriptionForUser',
        {
          defaultMessage: `Log rate analysis is a feature that uses advanced statistical methods to identify reasons for increases or decreases in log rates.`,
        }
      ),
      description: `Log rate analysis is a Elastic AIOps feature that uses advanced statistical methods to identify reasons for increases or decreases in time series of log rates. The analysis returns significant field/value pairs found in the log rate change. The importance of field/value pairs is logIncrease descending. Briefly explain the data with value examples. Values with the same increase might correlate. Suggest actionable insights for remediations and identify potential security and performance issues. Finally, if available, provide a link to the log rate analysis UI.`,
      parameters,
    },
    async ({ arguments: args }, abortSignal): Promise<GetAiopsLogRateAnalysisFunctionResponse> => {
      const debugStartTime = Date.now();
      const { esClient } = resources;
      console.log('args', args);

      // CHANGE POINT DETECTION

      const barTarget = 70;
      const earliestMs = dateMath.parse(args.start)?.valueOf();
      const latestMs = dateMath.parse(args.end, { roundUp: true })?.valueOf();

      if (earliestMs === undefined || latestMs === undefined) {
        return { content: 'Could not parse time range.', data: [] };
      }
      const delta = latestMs - earliestMs;
      const dayMs = 86400 * 1000;
      const threshold = dayMs * 22;
      const intervalMs = delta > threshold ? dayMs : Math.round(delta / barTarget);

      const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
        eventRate: {
          date_histogram: {
            field: args.timefield,
            fixed_interval: `${intervalMs}ms`,
            min_doc_count: 0,
            ...(earliestMs !== undefined && latestMs !== undefined
              ? {
                  extended_bounds: {
                    min: earliestMs,
                    max: latestMs,
                  },
                }
              : {}),
          },
        },
        change_point_request: {
          // @ts-expect-error missing from ES spec
          change_point: {
            buckets_path: 'eventRate>_count',
          },
        },
      };

      const searchQuery = {
        range: {
          [args.timefield]: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      };
      const searchBody: estypes.MsearchMultisearchBody = {
        query: searchQuery,
        aggs,
        track_total_hits: false,
        size: 0,
      };

      const histogram = await esClient.search(
        {
          index: args.index,
          body: searchBody,
        },
        {
          // signal: abortSignal,
          maxRetries: 0,
        }
      );

      console.log('eventRate', histogram.aggregations.eventRate);
      console.log('change_point_request', histogram.aggregations.change_point_request);

      if (histogram.aggregations.change_point_request.bucket === undefined) {
        return { content: 'No log rate change detected.', data: [] };
      }

      const buckets = histogram.aggregations.eventRate.buckets.reduce((acc, cur) => {
        acc[cur.key] = cur.doc_count;
        return acc;
      }, {});

      const changePointTs = dateMath
        .parse(histogram.aggregations.change_point_request.bucket.key)
        ?.valueOf();

      if (changePointTs === undefined) {
        return { content: 'There was an error parsing the log rate change timestamp.', data: [] };
      }

      const extendedChangePoint = getExtendedChangePoint(buckets, changePointTs);
      console.log('extendedChangePoint', extendedChangePoint);
      const logRateType = Object.keys(histogram.aggregations.change_point_request.type)[0];
      const logRateAttributeName = `${logRateType}LogRate`;

      // FIELD CANDIDATES

      const fieldCandidates: string[] = [];
      let fieldCandidatesCount = fieldCandidates.length;
      const textFieldCandidates: string[] = [];
      let totalDocCount = 0;
      let zeroDocsFallback = false;
      const changePoint = {
        ...extendedChangePoint,
        key: changePointTs,
        type: logRateType,
      };
      const wp = getWindowParametersForTrigger(
        extendedChangePoint.startTs,
        intervalMs,
        earliestMs,
        latestMs,
        changePoint
      );

      const params: AiopsLogRateAnalysisSchema = {
        index: args.index,
        start: earliestMs,
        end: latestMs,
        searchQuery: JSON.stringify(searchQuery),
        timeFieldName: args.timefield,
        ...wp,
      };

      const indexInfo = await fetchIndexInfo(
        esClient,
        params,
        ['message', 'error.message'],
        abortSignal
      );
      console.log('indexInfo', indexInfo);

      fieldCandidates.push(...indexInfo.fieldCandidates);
      fieldCandidatesCount = fieldCandidates.length;
      textFieldCandidates.push(...indexInfo.textFieldCandidates);
      totalDocCount = indexInfo.deviationTotalDocCount;
      zeroDocsFallback = indexInfo.zeroDocsFallback;
      const sampleProbability = getSampleProbability(
        indexInfo.deviationTotalDocCount + indexInfo.baselineTotalDocCount
      );
      console.log('sampleProbability', sampleProbability);

      // SIGNIFICANT ITEMS

      fieldCandidatesCount = fieldCandidates.length;

      // This will store the combined count of detected significant log patterns and keywords
      let fieldValuePairsCount = 0;

      const significantCategories: SignificantItem[] = [];

      // Get significant categories of text fields
      if (textFieldCandidates.length > 100) {
        significantCategories.push(
          ...(await fetchSignificantCategories(
            esClient,
            params,
            textFieldCandidates,
            undefined,
            sampleProbability,
            () => {},
            abortSignal
          ))
        );
      }

      const significantTerms: SignificantItem[] = [];
      const fieldsToSample = new Set<string>();

      const pValuesQueue = queue(async function (fieldCandidate: string) {
        const pValues = await fetchSignificantTermPValues(
          esClient,
          params,
          [fieldCandidate],
          undefined,
          sampleProbability,
          () => {},
          abortSignal
        );

        if (pValues.length > 0) {
          pValues.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          significantTerms.push(...pValues);
        }
      }, MAX_CONCURRENT_QUERIES);

      pValuesQueue.push(fieldCandidates, (err) => {
        if (err) {
          pValuesQueue.kill();
        }
      });
      await pValuesQueue.drain();

      fieldValuePairsCount = significantCategories.length + significantTerms.length;

      if (fieldValuePairsCount === 0) {
        return { content: 'Log rate analysis did not identify any significant items.', data: [] };
      }

      // RETURN DATA
      const debugEndTime = Date.now();
      const debugDelta = (debugEndTime - debugStartTime) / 1000;
      console.log(`Took: ${debugDelta}s`);

      return {
        content: {
          logRateAnalysisUILink: `/app/ml/aiops/log_rate_analysis?index=${
            args.dataViewId
          }&_a=${rison.encode({
            logRateAnalysis: {
              wp: {
                bMin: wp.baselineMin,
                bMax: wp.baselineMax,
                dMin: wp.deviationMin,
                dMax: wp.deviationMax,
              },
            },
          })}`,
          logRateChange: {
            type: Object.keys(histogram.aggregations.change_point_request.type)[0],
            timestamp: histogram.aggregations.change_point_request.bucket.key,
            [logRateAttributeName]: histogram.aggregations.change_point_request.bucket.doc_count,
            averageLogRate: Math.round(mean(Object.values(buckets)) ?? 0),
            logRateAggregationIntervalUsedForAnalysis: moment
              .duration(Math.round(intervalMs / 1000), 'seconds')
              .humanize(),
            ...(sampleProbability < 1
              ? { documentSamplingFactorForAnalysis: sampleProbability }
              : {}),
          },
          significantItems: [...significantTerms, ...significantCategories]
            .filter(({ bg_count, doc_count }) => {
              return doc_count > bg_count;
            })
            .map(({ fieldName, fieldValue, type, doc_count, bg_count }) => ({
              field: fieldName,
              value: fieldValue,
              type: type === 'keyword' ? 'metadata' : 'log message pattern',
              documentCount: doc_count,
              baselineCount: bg_count,
              logIncrease:
                bg_count > 0
                  ? `${Math.round((doc_count / bg_count) * 100) / 100}x increase`
                  : `${doc_count} documents up from 0 documents in baseline`,
            })),
        },
        data: [...significantTerms, ...significantCategories],
      };
    }
  );
}

export type GetAiopsLogRateAnalysisFunctionArguments = FromSchema<typeof parameters>;
export interface GetAiopsLogRateAnalysisFunctionResponse {
  content: any;
  data: typeof significantTerms;
}
