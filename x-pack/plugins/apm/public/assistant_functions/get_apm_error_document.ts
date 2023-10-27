/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RegisterFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/common/types';
import { callApmApi } from '../services/rest/create_call_apm_api';

export function registerGetApmErrorDocumentFunction({
  registerFunction,
}: {
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'get_apm_error_document',
      contexts: ['apm'],
      description: `Get a sample error document based on its grouping name. This also includes the 
      stacktrace of the error, which might give you a hint as to what the cause is. 
      ONLY use this for error events.`,
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmErrorDocument.descriptionForUser',
        {
          defaultMessage: `Get a sample error document based on its grouping name. This also includes the 
      stacktrace of the error, which might give you a hint as to what the cause is.`,
        }
      ),
      parameters: {
        type: 'object',
        properties: {
          'error.grouping_name': {
            type: 'string',
            description:
              'The grouping name of the error. Use the field value returned by get_apm_chart or get_correlation_values.',
          },
          start: {
            type: 'string',
            description:
              'The start of the time range, in Elasticsearch date math, lik  e `now`.',
          },
          end: {
            type: 'string',
            description:
              'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
        },
        required: ['start', 'end', 'error.grouping_name'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      return callApmApi('GET /internal/apm/assistant/get_error_document', {
        signal,
        params: {
          query: args,
        },
      });
    }
  );
}
