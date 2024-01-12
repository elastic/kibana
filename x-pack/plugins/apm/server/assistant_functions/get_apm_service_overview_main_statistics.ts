/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import { FunctionRegistrationParameters } from '.';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';
import { getServiceInstancesMainStatistics } from '../routes/services/get_service_instances/main_statistics';
import { getSearchTransactionsEvents } from '../lib/helpers/transactions';

export interface ApmServiceOverviewInstancesListItem {
  'service.name': string;
  'asset.name'?: string;
  metrics: {
    cpuUsage?: number | null;
    memoryUsage?: number | null;
    throughput?: number;
    latency?: number;
    errorRate?: number;
  };
}

export function registerGetApmServiceOverviewInstancesListFunction({
  apmEventClient,
  resources,
  registerFunction,
  config,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_apm_services_instances_main_statistics',
      contexts: ['apm'],
      description: `Gets the service overview of the infrastructure asset instances running a service.  
      It gives the list infrastructure assets such as host(s), pod(s), containers(s) that are running a service.`,
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmServicesList.descriptionForUser',
        {
          defaultMessage: `Gets the service overview of the infrastructure asset instances running a service.`,
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
          'service.name': {
            ...NON_EMPTY_STRING,
            description:
              'The name of the service that the infastructure asset list should be retrieved for.',
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
        },
        required: ['service.name', 'start', 'end'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      const start = datemath.parse(args.start)?.valueOf()!;
      const end = datemath.parse(args.end)?.valueOf()!;

      const searchAggregatedTransactions = await getSearchTransactionsEvents({
        config,
        apmEventClient,
        kuery: '',
        start,
        end,
      });

      const currentPeriod = await getServiceInstancesMainStatistics({
        environment: args['service.environment'] || ENVIRONMENT_ALL.value,
        kuery: '',
        latencyAggregationType: LatencyAggregationType.avg,
        serviceName: args['service.name'],
        apmEventClient,
        transactionType: 'request',
        searchAggregatedTransactions,
        start,
        end,
      });

      const mappedItems = currentPeriod.map(
        (item): ApmServiceOverviewInstancesListItem => {
          return {
            'service.name': args['service.name'],
            'asset.name': item.serviceNodeName,
            metrics: {
              cpuUsage: item.cpuUsage,
              memoryUsage: item.memoryUsage,
              throughput: item.throughput,
              latency: item.latency,
              errorRate: item.errorRate,
            },
          };
        }
      );

      return {
        content: mappedItems,
      };
    }
  );
}
