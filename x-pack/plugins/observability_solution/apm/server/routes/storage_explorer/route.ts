/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import {
  indexLifecyclePhaseRt,
  IndexLifecyclePhaseSelectOption,
} from '../../../common/storage_explorer_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, probabilityRt, rangeRt } from '../default_api_types';
import { getServiceNamesFromTermsEnum } from '../services/get_services/get_service_names_from_terms_enum';
import {
  getServiceStatistics,
  StorageExplorerServiceStatisticsResponse,
} from './get_service_statistics';
import { getSizeTimeseries, SizeTimeseriesResponse } from './get_size_timeseries';
import { getStorageDetails, StorageDetailsResponse } from './get_storage_details';
import {
  getSummaryStatistics,
  StorageExplorerSummaryStatisticsResponse,
} from './get_summary_statistics';
import { hasStorageExplorerPrivileges } from './has_storage_explorer_privileges';
import { isCrossClusterSearch } from './is_cross_cluster_search';

const storageExplorerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([indexLifecyclePhaseRt, probabilityRt, environmentRt, kueryRt, rangeRt]),
  }),
  handler: async (
    resources
  ): Promise<{
    serviceStatistics: StorageExplorerServiceStatisticsResponse;
  }> => {
    const {
      config,
      params,
      context,
      request,
      plugins: { security },
    } = resources;

    const {
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
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
    query: t.intersection([indexLifecyclePhaseRt, probabilityRt, environmentRt, kueryRt, rangeRt]),
  }),
  handler: async (resources): Promise<StorageDetailsResponse> => {
    const {
      params,
      context,
      request,
      plugins: { security },
    } = resources;

    const {
      path: { serviceName },
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
    } = params;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    return getStorageDetails({
      apmEventClient,
      context,
      start,
      end,
      environment,
      kuery,
      indexLifecyclePhase,
      randomSampler,
      serviceName,
    });
  },
});

const storageChartRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_chart',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([indexLifecyclePhaseRt, probabilityRt, environmentRt, kueryRt, rangeRt]),
  }),
  handler: async (
    resources
  ): Promise<{
    storageTimeSeries: SizeTimeseriesResponse;
  }> => {
    const {
      config,
      params,
      context,
      request,
      plugins: { security },
    } = resources;

    const {
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
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
    query: t.intersection([indexLifecyclePhaseRt, probabilityRt, environmentRt, kueryRt, rangeRt]),
  }),
  handler: async (resources): Promise<StorageExplorerSummaryStatisticsResponse> => {
    const {
      config,
      params,
      context,
      request,
      plugins: { security },
    } = resources;

    const {
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
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

    return getSummaryStatistics({
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      context,
      indexLifecyclePhase,
      randomSampler,
      searchAggregatedTransactions,
    });
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
    query: t.intersection([indexLifecyclePhaseRt, environmentRt, kueryRt, rangeRt]),
  }),
  handler: async (
    resources
  ): Promise<{
    services: Array<{
      serviceName: string;
    }>;
  }> => {
    const {
      query: { environment, kuery, indexLifecyclePhase, start, end },
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
      start,
      end,
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

const SECURITY_REQUIRED_MESSAGE = i18n.translate('xpack.apm.api.storageExplorer.securityRequired', {
  defaultMessage: 'Security plugin is required',
});
