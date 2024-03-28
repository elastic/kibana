/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FromSchema } from 'json-schema-to-ts';
import { FunctionRegistrationParameters } from '.';
// import { ApmTimeseries, getApmTimeseries } from '../routes/assistant_functions/get_apm_timeseries';

import { significantTerms } from '../significant_terms_kibana_logs';

export const NON_EMPTY_STRING = {
  type: 'string' as const,
  minLength: 1,
};

const parameters = {
  type: 'object',
  properties: {
    start: {
      type: 'string',
      description: 'The start of the time range, in Elasticsearch date math, like `now`.',
    },
    end: {
      type: 'string',
      description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
    },
  },
  required: [],
} as const;

export function registerGetAiopsLogRateAnalysisFunction({
  apmEventClient,
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
      description: `Analyse a time series to identify log rate changes with contributing field/value pairs. The API returns significant field/value pairs found in the log rate change. The importance of field/value pairs is logIncrease descending. Briefly explain the data with value examples. Values with the same increase might correlate. Suggest actionable insights for remediations. Identify problematic users and services.`,
      parameters,
    },
    async ({ arguments: args }, signal): Promise<GetAiopsLogRateAnalysisFunctionResponse> => {
      console.log('args', args);
      return {
        content: significantTerms
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
        data: significantTerms,
      };
    }
  );
}

export type GetAiopsLogRateAnalysisFunctionArguments = FromSchema<typeof parameters>;
export interface GetAiopsLogRateAnalysisFunctionResponse {
  content: Pick<typeof significantTerms, 'fieldName' | 'fieldValue'>;
  data: typeof significantTerms;
}
