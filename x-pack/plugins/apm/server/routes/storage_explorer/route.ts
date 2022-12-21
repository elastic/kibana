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
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import {
  indexLifecyclePhaseRt,
  IndexLifecyclePhaseSelectOption,
} from '../../../common/storage_explorer_types';
import { getServiceStatistics } from './get_service_statistics';
import {
  probabilityRt,
  environmentRt,
  kueryRt,
  rangeRt,
} from '../default_api_types';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import {
  getStorageDetailsPerIndex,
  getStorageDetailsPerProcessorEvent,
} from './get_storage_details_per_service';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSizeTimeseries } from './get_size_timeseries';
import { hasStorageExplorerPrivileges } from './has_storage_explorer_privileges';
import {
  getMainSummaryStats,
  getTracesPerMinute,
} from './get_summary_statistics';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { isCrossClusterSearch } from './is_cross_cluster_search';
import { getServiceNamesFromTermsEnum } from '../services/get_services/get_sorted_and_filtered_services';

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
      config,
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

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery,
    });

    const serviceStatistics = await getServiceStatistics({
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
    indicesStats: Array<{
      indexName: string;
      numberOfDocs: number;
      primary?: number | string;
      replica?: number | string;
      size?: number;
      dataStream?: string;
      lifecyclePhase?: string;
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

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const [processorEventStats, indicesStats] = await Promise.all([
      getStorageDetailsPerProcessorEvent({
        apmEventClient,
        context,
        indexLifecyclePhase,
        randomSampler,
        environment,
        kuery,
        start,
        end,
        serviceName,
      }),
      getStorageDetailsPerIndex({
        apmEventClient,
        context,
        indexLifecyclePhase,
        randomSampler,
        environment,
        kuery,
        start,
        end,
        serviceName,
      }),
    ]);

    return { processorEventStats, indicesStats };
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
      config,
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

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
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

    const apmEventClient = await getApmEventClient(resources);
    const hasPrivileges = await hasStorageExplorerPrivileges({
      context,
      apmEventClient,
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
    totalSize: number;
    diskSpaceUsedPct: number;
    estimatedIncrementalSize: number;
    dailyDataGeneration: number;
  }> => {
    const {
      config,
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

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery,
    });

    const [mainSummaryStats, tracesPerMinute] = await Promise.all([
      getMainSummaryStats({
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

const storageExplorerIsCrossClusterSearchRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer/is_cross_cluster_search',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ isCrossClusterSearch: boolean }> => {
    const apmEventClient = await getApmEventClient(resources);
    return { isCrossClusterSearch: isCrossClusterSearch(apmEventClient) };
  },
});

const storageExplorerGetServices = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer/get_services',
  options: {
    tags: ['access:apm'],
  },
  params: t.type({
    query: t.intersection([indexLifecyclePhaseRt, environmentRt, kueryRt]),
  }),
  handler: async (
    resources
  ): Promise<{
    services: Array<{
      serviceName: string;
    }>;
  }> => {
    const {
      query: { environment, kuery, indexLifecyclePhase },
    } = resources.params;

    if (
      kuery ||
      indexLifecyclePhase !== IndexLifecyclePhaseSelectOption.All ||
      environment !== ENVIRONMENT_ALL.value
    ) {
      return {
        services: [],
      };
    }

    const apmEventClient = await getApmEventClient(resources);

    const services = await getServiceNamesFromTermsEnum({
      apmEventClient,
      environment,
      maxNumberOfServices: 500,
    });

    return {
      services: services.map((serviceName): { serviceName: string } => ({
        serviceName,
      })),
    };
  },
});

export const storageExplorerRouteRepository = {
  ...storageExplorerRoute,
  ...storageExplorerServiceDetailsRoute,
  ...storageChartRoute,
  ...storageExplorerPrivilegesRoute,
  ...storageExplorerSummaryStatsRoute,
  ...storageExplorerIsCrossClusterSearchRoute,
  ...storageExplorerGetServices,
};

const SECURITY_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.storageExplorer.securityRequired',
  { defaultMessage: 'Security plugin is required' }
);
