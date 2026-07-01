/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { IndexLifecyclePhaseSelectOption } from '@kbn/apm-types';
import {
  routeDefinitions,
  type StorageExplorerRouteResponse,
  type StorageDetailsResponse,
  type StorageChartRouteResponse,
  type StorageExplorerPrivilegesResponse,
  type StorageExplorerSummaryStatisticsResponse,
  type StorageExplorerIsCrossClusterResponse,
  type StorageExplorerGetServicesResponse,
} from '@kbn/apm-api-shared';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getServiceNamesFromTermsEnum } from '../services/get_services/get_service_names_from_terms_enum';
import { getServiceStatistics } from './get_service_statistics';
import { getSizeTimeseries } from './get_size_timeseries';
import { getStorageDetails } from './get_storage_details';
import { getSummaryStatistics } from './get_summary_statistics';
import { hasStorageExplorerPrivileges } from './has_storage_explorer_privileges';
import { isCrossClusterSearch } from './is_cross_cluster_search';

const storageExplorerRoute = createApmServerRoute({
  endpoint: routeDefinitions.storageExplorer.storageExplorer.endpoint,
  params: routeDefinitions.storageExplorer.storageExplorer.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageExplorerRouteResponse> => {
    const { config, params, context, request, core } = resources;

    const {
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
    } = params;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
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
  endpoint: routeDefinitions.storageExplorer.serviceDetails.endpoint,
  params: routeDefinitions.storageExplorer.serviceDetails.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageDetailsResponse> => {
    const { params, context, request, core } = resources;

    const {
      path: { serviceName },
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
    } = params;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
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
  endpoint: routeDefinitions.storageExplorer.chart.endpoint,
  params: routeDefinitions.storageExplorer.chart.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageChartRouteResponse> => {
    const { config, params, context, request, core } = resources;

    const {
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
    } = params;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
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
  endpoint: routeDefinitions.storageExplorer.privileges.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageExplorerPrivilegesResponse> => {
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
  endpoint: routeDefinitions.storageExplorer.summaryStats.endpoint,
  params: routeDefinitions.storageExplorer.summaryStats.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageExplorerSummaryStatisticsResponse> => {
    const { config, params, context, request, core } = resources;

    const {
      query: { indexLifecyclePhase, probability, environment, kuery, start, end },
    } = params;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
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
  endpoint: routeDefinitions.storageExplorer.isCrossCluster.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageExplorerIsCrossClusterResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    return { isCrossClusterSearch: isCrossClusterSearch(apmEventClient) };
  },
});

const storageExplorerGetServices = createApmServerRoute({
  endpoint: routeDefinitions.storageExplorer.getServices.endpoint,
  params: routeDefinitions.storageExplorer.getServices.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<StorageExplorerGetServicesResponse> => {
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
