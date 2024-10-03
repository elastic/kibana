/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FromSchema } from 'json-schema-to-ts';
import dedent from 'dedent';

import rison from '@kbn/rison';
import { i18n } from '@kbn/i18n';
import { fetchLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis';

import type { GetAiopsLogRateAnalysisFunctionResponse } from '../../common/types';

import { FunctionRegistrationParameters } from '.';
// import { ApmTimeseries, getApmTimeseries } from '../routes/assistant_functions/get_apm_timeseries';

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
      // contexts: ['aiops'],
      name: 'get_aiops_log_rate_analysis',
      descriptionForUser: i18n.translate(
        'xpack.aiops.observabilityAiAssistant.functions.registerGetAiopsLogRateAnalyssi.descriptionForUser',
        {
          defaultMessage: `Log rate analysis is a feature that uses advanced statistical methods to identify reasons for increases or decreases in log rates.`,
        }
      ),
      description: dedent(`
        Log rate analysis is an AIOps feature to identify causes of spike/dips in log rate time series. If a spike gets detected, the significant items are the log patterns that are more frequent in the spike compared to the baseline. If a dip gets detected, the significant items are the log patterns that are more frequent in the baseline and are reduced or missing in the dip.

        Your task is the following:

        - Briefly infer the environment based on all data available and summarize field/value pairs with up to 3 individual examples. Summary hint: Items with the same logRateChange might be related.
        - Evaluate if the log rate change could be results of regular operations or if the data hints at a security or performance issue, if applicable briefly explain the root cause with concrete steps to remediate the problem.
        - Your output should be brief and very concise. Your audience are technical users like SREs or Security Analysts using Elasticsearch and Kibana.
        - Limit overall output to 300 words.
      `),
      parameters,
    },
    async ({ arguments: args }, abortSignal): Promise<GetAiopsLogRateAnalysisFunctionResponse> => {
      const { esClient } = resources;

      const resp = await fetchLogRateAnalysis({
        esClient,
        abortSignal,
        arguments: {
          index: args.index,
          start: args.start,
          end: args.end,
          timefield: args.timefield,
        },
      });

      const { logRateChange, significantItems, dateHistogramBuckets, windowParameters } = resp;

      return {
        content: {
          logRateChange,
          significantItems: significantItems.slice(0, 100),
        },
        data: {
          dateHistogram: dateHistogramBuckets,
          logRateAnalysisUILink: `/app/ml/aiops/log_rate_analysis?index=${
            args.dataViewId
          }&_a=${rison.encode({
            logRateAnalysis: {
              wp: {
                bMin: windowParameters.baselineMin,
                bMax: windowParameters.baselineMax,
                dMin: windowParameters.deviationMin,
                dMax: windowParameters.deviationMax,
              },
            },
          })}`,
          logRateChange,
          significantItems: significantItems.slice(0, 100),
        },
      };
    }
  );
}

export type GetAiopsLogRateAnalysisFunctionArguments = FromSchema<typeof parameters>;
