/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { FunctionRegistrationParameters } from '.';
import { ApmDocumentType } from '../../common/document_type';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { RollupInterval } from '../../common/rollup';
import { ServiceHealthStatus } from '../../common/service_health_status';
import { getApmAlertsClient } from '../lib/helpers/get_apm_alerts_client';
import { getMlClient } from '../lib/helpers/get_ml_client';
import { getRandomSampler } from '../lib/helpers/get_random_sampler';
import { getServicesItems } from '../routes/services/get_services/get_services_items';
import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';

export interface ApmServicesListItem {
  'service.name': string;
  'agent.name'?: string;
  'transaction.type'?: string;
  alertsCount: number;
  healthStatus: ServiceHealthStatus;
  'service.environment'?: string[];
}

export function registerGetApmServicesListFunction({
  apmEventClient,
  resources,
  registerFunction,
}: FunctionRegistrationParameters) {
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
      const { healthStatus } = args;
      const [apmAlertsClient, mlClient, randomSampler] = await Promise.all([
        getApmAlertsClient(resources),
        getMlClient(resources),
        getRandomSampler({
          security: resources.plugins.security,
          probability: 1,
          request: resources.request,
        }),
      ]);

      const start = datemath.parse(args.start)?.valueOf()!;
      const end = datemath.parse(args.end)?.valueOf()!;

      const serviceItems = await getServicesItems({
        apmAlertsClient,
        apmEventClient,
        documentType: ApmDocumentType.TransactionMetric,
        start,
        end,
        environment: args['service.environment'] || ENVIRONMENT_ALL.value,
        kuery: '',
        logger: resources.logger,
        randomSampler,
        rollupInterval: RollupInterval.OneMinute,
        serviceGroup: null,
        mlClient,
        useDurationSummary: false,
      });

      let mappedItems = serviceItems.items.map((item): ApmServicesListItem => {
        return {
          'service.name': item.serviceName,
          'agent.name': item.agentName,
          alertsCount: item.alertsCount ?? 0,
          healthStatus: item.healthStatus ?? ServiceHealthStatus.unknown,
          'service.environment': item.environments,
          'transaction.type': item.transactionType,
        };
      });

      if (healthStatus && healthStatus.length) {
        mappedItems = mappedItems.filter((item): boolean =>
          healthStatus.includes(item.healthStatus)
        );
      }

      return {
        content: mappedItems,
      };
    }
  );
}
