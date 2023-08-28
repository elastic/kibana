/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

const DEFAULT_FEATURE_IDS = [
  'apm',
  'infrastructure',
  'logs',
  'uptime',
  'slo',
  'observability',
] as const;

export function registerAlertsFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'alerts',
      contexts: ['core'],
      description:
        'Get alerts for Observability. Display the response in tabular format if appropriate.',
      descriptionForUser: 'Get alerts for Observability',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          featureIds: {
            type: 'array',
            additionalItems: false,
            items: {
              type: 'string',
              enum: DEFAULT_FEATURE_IDS,
            },
            description:
              'The Observability apps for which to retrieve alerts. By default it will return alerts for all apps.',
          },
          start: {
            type: 'string',
            description: 'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            type: 'string',
            description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
          filter: {
            type: 'string',
            description:
              'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    ({ arguments: { start, end, featureIds, filter } }, signal) => {
      return service.callApi('POST /internal/observability_ai_assistant/functions/alerts', {
        params: {
          body: {
            start,
            end,
            featureIds:
              featureIds && featureIds.length > 0 ? featureIds : DEFAULT_FEATURE_IDS.concat(),
            filter,
          },
        },
        signal,
      });
    }
  );
}
