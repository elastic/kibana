/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionRegistrationParameters } from '.';
import { getApmErrorDocument } from '../routes/assistant_functions/get_apm_error_document';

export function registerGetApmErrorDocumentFunction({
  apmEventClient,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_apm_error_document',
      contexts: ['apm'],
      description: `Get sample error documents based on its grouping name. This also includes the 
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
              'The grouping name of the error. Use the field value returned by get_apm_chart or get_correlation_values. Leave this field empty to get the top 3 errors',
          },
          'service.name': {
            type: 'string',
            description: 'The name of the service you want to get errors for',
          },
          start: {
            type: 'string',
            description:
              'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            type: 'string',
            description:
              'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      return {
        content: await getApmErrorDocument({
          apmEventClient,
          arguments: args,
        }),
      };
    }
  );
}
