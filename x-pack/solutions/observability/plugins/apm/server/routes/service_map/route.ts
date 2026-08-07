/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  routeDefinitions,
  type ServiceMapRouteResponse,
  type ServiceMapServiceBadgesResponse,
  type ServiceMapServiceDependencyInfoResponse,
} from '@kbn/apm-api-shared';
import { apmServiceGroupMaxNumberOfServices } from '@kbn/observability-plugin/common';
import type { BoolQuery } from '@kbn/es-query';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage } from '../../../common/service_map/utils';
import { notifyFeatureUsage } from '../../feature';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getApmSloClient } from '../../lib/helpers/get_apm_slo_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getServiceGroup } from '../service_groups/get_service_group';
import { getServiceMap } from './get_service_map';
import { getServiceMapDependencyNodeInfo } from './get_service_map_dependency_node_info';
import { getServiceMapServiceBadges } from './get_service_map_service_badges';

const serviceMapRoute = createApmServerRoute({
  endpoint: routeDefinitions.serviceMap.serviceMap.endpoint,
  params: routeDefinitions.serviceMap.serviceMap.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapRouteResponse> => {
    const { config, context, params, logger } = resources;
    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    notifyFeatureUsage({
      licensingPlugin: licensingContext,
      featureName: 'serviceMaps',
    });

    const {
      query: { serviceName, serviceGroup: serviceGroupId, environment, start, end, kuery, esQuery },
    } = params;

    const {
      savedObjects: { client: savedObjectsClient },
      uiSettings: { client: uiSettingsClient },
    } = await context.core;

    const [mlClient, apmEventClient, serviceGroup, maxNumberOfServices] = await Promise.all([
      getMlClient(resources),
      getApmEventClient(resources),
      serviceGroupId
        ? getServiceGroup({
            savedObjectsClient,
            serviceGroupId,
          })
        : Promise.resolve(null),
      uiSettingsClient.get<number>(apmServiceGroupMaxNumberOfServices),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
      kuery,
    });

    return getServiceMap({
      mlClient,
      config,
      apmEventClient,
      serviceName,
      environment,
      searchAggregatedTransactions,
      logger: logger.get('serviceMap'),
      start,
      end,
      maxNumberOfServices,
      serviceGroupKuery: serviceGroup?.kuery,
      kuery,
      esQuery: esQuery as { bool: BoolQuery } | undefined,
    });
  },
});

const serviceMapDependencyNodeRoute = createApmServerRoute({
  endpoint: routeDefinitions.serviceMap.dependencyNode.endpoint,
  params: routeDefinitions.serviceMap.dependencyNode.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapServiceDependencyInfoResponse> => {
    const { config, context, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }
    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    const apmEventClient = await getApmEventClient(resources);

    const {
      query: { dependencies, sourceServiceName, environment, start, end, offset },
    } = params;

    return getServiceMapDependencyNodeInfo({
      apmEventClient,
      sourceServiceName,
      dependencies: Array.isArray(dependencies) ? dependencies : [dependencies],
      start,
      end,
      environment,
      offset,
    });
  },
});

const serviceMapServiceBadgesRoute = createApmServerRoute({
  endpoint: routeDefinitions.serviceMap.serviceBadges.endpoint,
  params: routeDefinitions.serviceMap.serviceBadges.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapServiceBadgesResponse> => {
    const { config, context, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }
    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const {
      query: { environment, start, end, kuery },
      body: { serviceNames },
    } = params;

    const [apmAlertsClient, sloClient] = await Promise.all([
      getApmAlertsClient(resources).catch((): undefined => undefined),
      getApmSloClient(resources),
    ]);

    return getServiceMapServiceBadges({
      serviceNames,
      environment,
      start,
      end,
      kuery,
      apmAlertsClient,
      sloClient,
    });
  },
});

export const serviceMapRouteRepository = {
  ...serviceMapRoute,
  ...serviceMapDependencyNodeRoute,
  ...serviceMapServiceBadgesRoute,
};
