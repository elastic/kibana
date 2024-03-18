/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FunctionRegistrationParameters } from '.';
import { CorrelationsEventType } from '../../common/assistant/constants';
import { getApmCorrelationValues } from '../routes/assistant_functions/get_apm_correlation_values';

export function registerGetApmCorrelationsFunction({
  apmEventClient,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_apm_correlations',
      contexts: ['apm'],
      description: `Get field values that are more prominent in the foreground set than the 
      background set. This can be useful in determining what attributes (like 
      error.message, service.node.name or transaction.name) are contributing to for 
      instance a higher latency. Another option is a time-based comparison, where you 
      compare before and after a change point. In KQL, escaping happens with double 
      quotes, not single quotes. Some characters that need escaping are: ':()\\\/\". 
      IF you need to filter, make sure the fields are available on the event, and 
      ALWAYS put a field value in double quotes. Best: event.outcome:\"failure\". 
      Wrong: event.outcome:'failure'. This is very important! ONLY use this function 
      if you have something to compare it to.`,
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmCorrelationsFunction.descriptionForUser',
        {
          defaultMessage: `Get field values that are more prominent in the foreground set than the 
      background set. This can be useful in determining what attributes (like 
      error.message, service.node.name or transaction.name) are contributing to for 
      instance a higher latency. Another option is a time-based comparison, where you 
      compare before and after a change point.`,
        }
      ),
      parameters: {
        type: 'object',
        properties: {
          sets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description:
                    'A unique, human readable label for the comparison set.',
                },
                background: {
                  description: 'The background data set',
                  $ref: '#/$defs/set',
                },
                foreground: {
                  description:
                    'The foreground data set. Needs to be a subset of the background set',
                  $ref: '#/$defs/set',
                },
                event: {
                  type: 'string',
                  enum: [
                    CorrelationsEventType.Error,
                    CorrelationsEventType.Transaction,
                    CorrelationsEventType.ExitSpan,
                  ],
                },
              },
              required: ['background', 'foreground', 'event'],
            },
          },
        },
        required: ['sets'],
        $defs: {
          set: {
            type: 'object',
            properties: {
              'service.name': {
                type: 'string',
                description: 'The name of the service',
              },
              'service.environment': {
                type: 'string',
                description: 'The environment that the service is running in.',
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
              filter: {
                type: 'string',
                description:
                  'a KQL query to filter the data by. Always escape, with double quotes. If no filter should be applied, leave it empty.',
              },
              label: {
                type: 'string',
                description: 'A unique, human readable label.',
              },
            },
            required: ['service.name', 'start', 'end', 'label'],
          },
        },
      } as const,
    },
    async ({ arguments: args }, signal) => {
      return {
        content: await getApmCorrelationValues({
          arguments: args as any,
          apmEventClient,
        }),
      };
    }
  );
}
