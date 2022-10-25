/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { indexLifecyclePhaseRt } from '../../../common/storage_explorer_types';
import { getServiceStatistics } from './get_service_statistics';
import {
  probabilityRt,
  environmentRt,
  kueryRt,
  rangeRt,
} from '../default_api_types';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { getStorageDetailsPerProcessorEvent } from './get_storage_details_per_processor_event';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSizeTimeseries } from './get_size_timeseries';
import { hasStorageExplorerPrivileges } from './has_storage_explorer_privileges';
import {
  getMainSummaryStats,
  getTracesPerMinute,
} from './get_summary_statistics';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

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
    serviceStatistics: Array<{
      serviceName: string;
      environments: string[];
      size?: number;
      agentName: AgentName;
      sampling: number;
    }>;
  }> => {
    const {
      params,
      context,
      request,
      plugins: { security },
    } = resources;

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

    const [setup, apmEventClient, randomSampler] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: setup.config,
      kuery,
    });

    const serviceStatistics = await getServiceStatistics({
      setup,
      apmEventClient,
      context,
      indexLifecyclePhase,
      randomSampler,
      environment,
      kuery,
      start,
      end,
      searchAggregatedTransactions,
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
    const {
      params,
      context,
      request,
      plugins: { security },
    } = resources;

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

    const [setup, apmEventClient, randomSampler] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const processorEventStats = await getStorageDetailsPerProcessorEvent({
      setup,
      apmEventClient,
      context,
      indexLifecyclePhase,
      randomSampler,
      environment,
      kuery,
      start,
      end,
      serviceName,
    });

    return { processorEventStats };
  },
});

const storageChartRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_chart',
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
    storageTimeSeries: Array<{
      serviceName: string;
      timeseries: Array<{ x: number; y: number }>;
    }>;
  }> => {
    const {
      params,
      context,
      request,
      plugins: { security },
    } = resources;

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

    const [setup, apmEventClient, randomSampler] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: setup.config,
      kuery,
    });

    const storageTimeSeries = await getSizeTimeseries({
      searchAggregatedTransactions,
      indexLifecyclePhase,
      randomSampler,
      environment,
      kuery,
      start,
      end,
      setup,
      apmEventClient,
      context,
    });

    return { storageTimeSeries };
  },
});

const storageExplorerPrivilegesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer/privileges',
  options: { tags: ['access:apm'] },

  handler: async (resources): Promise<{ hasPrivileges: boolean }> => {
    const {
      plugins: { security },
      context,
    } = resources;

    if (!security) {
      throw Boom.internal(SECURITY_REQUIRED_MESSAGE);
    }

    const setup = await setupRequest(resources);
    const hasPrivileges = await hasStorageExplorerPrivileges({
      context,
      setup,
    });

    return { hasPrivileges };
  },
});

const storageExplorerSummaryStatsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer_summary_stats',
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
    tracesPerMinute: number;
    numberOfServices: number;
    estimatedSize: number;
    dailyDataGeneration: number;
  }> => {
    const {
      params,
      context,
      request,
      plugins: { security },
    } = resources;

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

    const [setup, apmEventClient, randomSampler] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: setup.config,
      kuery,
    });

    const [mainSummaryStats, tracesPerMinute] = await Promise.all([
      getMainSummaryStats({
        setup,
        apmEventClient,
        context,
        indexLifecyclePhase,
        randomSampler,
        start,
        end,
        environment,
        kuery,
      }),
      getTracesPerMinute({
        apmEventClient,
        indexLifecyclePhase,
        start,
        end,
        environment,
        kuery,
        searchAggregatedTransactions,
      }),
    ]);

    return {
      ...mainSummaryStats,
      tracesPerMinute,
    };
  },
});

export const storageExplorerRouteRepository = {
  ...storageExplorerRoute,
  ...storageExplorerServiceDetailsRoute,
  ...storageChartRoute,
  ...storageExplorerPrivilegesRoute,
  ...storageExplorerSummaryStatsRoute,
};

const SECURITY_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.storageExplorer.securityRequired',
  { defaultMessage: 'Security plugin is required' }
);
