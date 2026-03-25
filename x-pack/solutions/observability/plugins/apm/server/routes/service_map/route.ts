/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { apmServiceGroupMaxNumberOfServices } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import type { ServiceMapResponse, ServicesResponse } from '../../../common/service_map';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage } from '../../../common/service_map/utils';
import { notifyFeatureUsage } from '../../feature';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmSloClient } from '../../lib/helpers/get_apm_slo_client';
import {
  getServicesAlerts,
  type ServiceAlertsResponse,
} from '../services/get_services/get_service_alerts';
import type { SloStatus } from '../../../common/service_inventory';
import {
  getServicesSloStats,
  type ServiceSloStatsResponse,
} from '../services/get_services/get_services_slo_stats';
import { getServiceMap } from './get_service_map';
import { getServiceMapGroupByValues } from './get_service_map_group_by_values';
import type { ServiceMapServiceDependencyInfoResponse } from './get_service_map_dependency_node_info';
import { getServiceMapDependencyNodeInfo } from './get_service_map_dependency_node_info';
import type { ServiceMapServiceNodeInfoResponse } from './get_service_map_service_node_info';
import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt, kueryRt } from '../default_api_types';
import { getServiceGroup } from '../service_groups/get_service_group';
import { offsetRt } from '../../../common/comparison_rt';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const serviceMapRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        serviceGroup: t.string,
        kuery: kueryRt.props.kuery,
      }),
      environmentRt,
      rangeRt,
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapResponse> => {
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
      query: { serviceName, serviceGroup: serviceGroupId, environment, start, end, kuery },
    } = params;

    const {
      savedObjects: { client: savedObjectsClient },
      uiSettings: { client: uiSettingsClient },
    } = await context.core;

    const [
      mlClient,
      apmEventClient,
      serviceGroup,
      maxNumberOfServices,
      apmAlertsClient,
      sloClient,
    ] = await Promise.all([
      getMlClient(resources),
      getApmEventClient(resources),
      serviceGroupId
        ? getServiceGroup({
            savedObjectsClient,
            serviceGroupId,
          })
        : Promise.resolve(null),
      uiSettingsClient.get<number>(apmServiceGroupMaxNumberOfServices),
      getApmAlertsClient(resources),
      getApmSloClient(resources),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
      kuery,
    });

    const mapResponse = await getServiceMap({
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
    });

    // Collect all service names that appear on the map (servicesData + from spans), so badges
    // show for every visible service (e.g. when map is focused on one service, we still show
    // alerts/SLO for opbeans-go, redis, etc., not just the focused service).
    const visibleServiceNames = new Set<string>(
      mapResponse.servicesData.map((s: ServicesResponse): string => s[SERVICE_NAME])
    );
    for (const span of mapResponse.spans) {
      if (span.serviceName) {
        visibleServiceNames.add(span.serviceName);
      }
      if (span.destinationService?.serviceName) {
        visibleServiceNames.add(span.destinationService.serviceName);
      }
    }
    const serviceNamesForBadges = [...visibleServiceNames].slice(0, 100);
    if (serviceNamesForBadges.length > 0) {
      // Badges use the same start/end as the map; no service name filter so we get counts for all visible services.
      const [alertsResult, sloStatsResult] = await Promise.all([
        getServicesAlerts({
          apmAlertsClient,
          start,
          end,
          environment,
          serviceNames: serviceNamesForBadges,
          maxNumServices: serviceNamesForBadges.length,
        }).catch((err: Error): ServiceAlertsResponse => {
          logger.debug(err?.message ?? 'Failed to fetch alerts for service map badges');
          return [];
        }),
        getServicesSloStats({
          sloClient,
          environment,
          serviceNames: serviceNamesForBadges,
        }).catch((err: Error): ServiceSloStatsResponse => {
          logger.debug(err?.message ?? 'Failed to fetch SLO stats for service map badges');
          return [];
        }),
      ]);

      const serviceAlertsCounts: Record<string, number> = {};
      for (const { serviceName: name, alertsCount } of alertsResult) {
        serviceAlertsCounts[name] = alertsCount;
      }

      const serviceSloStats: Record<string, { sloStatus: SloStatus; sloCount: number }> = {};
      for (const { serviceName: name, sloStatus, sloCount } of sloStatsResult) {
        serviceSloStats[name] = { sloStatus, sloCount };
      }

      return {
        ...mapResponse,
        serviceAlertsCounts,
        serviceSloStats,
      };
    }

    return mapResponse;
  },
});

const serviceMapServiceNodeRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/service/{serviceName}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt, offsetRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapServiceNodeInfoResponse> => {
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
      path: { serviceName },
      query: { environment, start, end, offset },
    } = params;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
    });

    return getServiceMapServiceNodeInfo({
      environment,
      apmEventClient,
      serviceName,
      searchAggregatedTransactions,
      start,
      end,
      offset,
    });
  },
});

const serviceMapDependencyNodeRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/dependency',
  params: t.type({
    query: t.intersection([
      t.type({
        dependencies: t.union([t.string, t.array(t.string)]),
      }),
      t.partial({
        sourceServiceName: t.string,
      }),
      environmentRt,
      rangeRt,
      offsetRt,
    ]),
  }),
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

const serviceMapGroupByValuesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/group-by-values',
  params: t.type({
    query: t.intersection([
      t.type({
        serviceNames: t.string,
        groupByField: t.string,
      }),
      environmentRt,
      rangeRt,
      t.partial({ kuery: kueryRt.props.kuery }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<Record<string, string>> => {
    const { config, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const apmEventClient = await getApmEventClient(resources);
    const {
      query: { serviceNames, groupByField, environment, start, end, kuery = '' },
    } = params;

    const namesList = serviceNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
      kuery,
    });

    return getServiceMapGroupByValues({
      apmEventClient,
      searchAggregatedTransactions,
      serviceNames: namesList,
      groupByField,
      start,
      end,
      environment: environment ?? '',
      kuery,
    });
  },
});

export const serviceMapRouteRepository = {
  ...serviceMapRoute,
  ...serviceMapServiceNodeRoute,
  ...serviceMapDependencyNodeRoute,
  ...serviceMapGroupByValuesRoute,
};
