/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RegisterFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/common/types';
import { callApmApi } from '../services/rest/create_call_apm_api';

export function registerGetApmServiceSummaryFunction({
  registerFunction,
}: {
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'get_apm_service_summary',
      contexts: ['apm'],
      description: `Gets a summary of a single service, including: the language, service version, 
deployments, the environments, and the infrastructure that it is running in, for instance on how 
many pods, and a list of its downstream dependencies. It also returns active 
alerts and anomalies.`,
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmServiceSummary.descriptionForUser',
        {
          defaultMessage: `Gets a summary of a single service, including: the language, service version, 
deployments, the environments, and the infrastructure that it is running in, for instance on how 
many pods, and a list of its downstream dependencies. It also returns active 
alerts and anomalies.`,
        }
      ),
      parameters: {
        type: 'object',
        properties: {
          'service.name': {
            type: 'string',
            description: 'The name of the service that should be summarized.',
          },
          'service.environment': {
            type: 'string',
            description: 'The environment that the service is running in',
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
        required: ['service.name', 'start', 'end'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      return callApmApi('GET /internal/apm/assistant/get_service_summary', {
        signal,
        params: {
          query: args,
        },
      });
    }
  );
}
