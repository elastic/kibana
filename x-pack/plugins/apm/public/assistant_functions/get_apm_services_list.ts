/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RegisterFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/common/types';
import { ServiceHealthStatus } from '../../common/service_health_status';
import { callApmApi } from '../services/rest/create_call_apm_api';
import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';

export function registerGetApmServicesListFunction({
  registerFunction,
}: {
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'get_apm_services_list',
      contexts: ['apm'],
      description: `Gets a list of services`,
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmServicesList.descriptionForUser',
        {
          defaultMessage: `Gets the list of monitored services, their health status, and alerts.`,
        }
      ),
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          'service.environment': {
            ...NON_EMPTY_STRING,
            description:
              'Optionally filter the services by the environments that they are running in',
          },
          start: {
            ...NON_EMPTY_STRING,
            description:
              'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            ...NON_EMPTY_STRING,
            description:
              'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
          healthStatus: {
            type: 'array',
            description: 'Filter service list by health status',
            additionalProperties: false,
            additionalItems: false,
            items: {
              type: 'string',
              enum: [
                ServiceHealthStatus.unknown,
                ServiceHealthStatus.healthy,
                ServiceHealthStatus.warning,
                ServiceHealthStatus.critical,
              ],
            },
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      return callApmApi('POST /internal/apm/assistant/get_services_list', {
        signal,
        params: {
          body: args,
        },
      });
    }
  );
}
