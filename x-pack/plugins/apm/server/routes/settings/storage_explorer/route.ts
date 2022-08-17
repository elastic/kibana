/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getSearchAggregatedTransactions } from '../../../lib/helpers/transactions';
import { setupRequest } from '../../../lib/helpers/setup_request';
import { getDocCountPerProcessorEvent } from './get_doc_count_per_processor_event';
import { indexLifecyclePhaseRt } from '../../../../common/storage_explorer_types';
import { getServiceStatistics } from './get_service_statistics';
import { getTotalTransactionsPerService } from './get_total_transactions_per_service';
import {
  probabilityRt,
  environmentRt,
  kueryRt,
  rangeRt,
} from '../../default_api_types';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { getStorageDetailsForService } from './get_storage_details_for_service';

const storageExplorerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([
      indexLifecyclePhaseRt,
      probabilityRt,
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  handler: async (
    resources
  ): Promise<{
    totalSizeInBytes?: number;
    serviceStatistics: Array<{
      serviceName: string;
      environments: string[];
      size?: number;
      agentName: AgentName;
      sampling: number;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const { params, context } = resources;
    const {
      query: {
        indexLifecyclePhase,
        probability,
        environment,
        kuery,
        start,
        end,
      },
    } = params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });

    const [docCountPerProcessorEvent, totalTransactionsPerService] =
      await Promise.all([
        getDocCountPerProcessorEvent({
          setup,
          context,
          indexLifecyclePhase,
          probability,
          environment,
          kuery,
          start,
          end,
        }),
        getTotalTransactionsPerService({
          setup,
          searchAggregatedTransactions,
          indexLifecyclePhase,
          probability,
          environment,
          kuery,
          start,
          end,
        }),
      ]);

    const serviceStatistics = getServiceStatistics({
      docCountPerProcessorEvent,
      totalTransactionsPerService,
    });

    return {
      serviceStatistics,
    };
  },
});

const storageExplorerServiceDetailsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/storage_details',
  options: { tags: ['access:apm'] },
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      indexLifecyclePhaseRt,
      probabilityRt,
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  handler: async (
    resources
  ): Promise<{
    processorEventStats: Array<{
      processorEvent:
        | ProcessorEvent.transaction
        | ProcessorEvent.error
        | ProcessorEvent.metric
        | ProcessorEvent.span;
      docs: number;
      size: number;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const { params, context } = resources;
    const {
      path: { serviceName },
      query: {
        indexLifecyclePhase,
        probability,
        environment,
        kuery,
        start,
        end,
      },
    } = params;

    const processorEventStats = await getStorageDetailsForService({
      setup,
      context,
      indexLifecyclePhase,
      probability,
      environment,
      kuery,
      start,
      end,
      serviceName,
    });

    return { processorEventStats };
  },
});

export const storageExplorerRouteRepository = {
  ...storageExplorerRoute,
  ...storageExplorerServiceDetailsRoute,
};
