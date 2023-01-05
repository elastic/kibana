/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { apmServiceGroupMaxNumberOfServices } from '@kbn/observability-plugin/common';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage } from '../../../common/service_map';
import { notifyFeatureUsage } from '../../feature';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getServiceMap } from './get_service_map';
import { getServiceMapDependencyNodeInfo } from './get_service_map_dependency_node_info';
import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt } from '../default_api_types';
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
      }),
      environmentRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    elements: Array<
      | import('./../../../common/service_map').ConnectionElement
      | {
          data: {
            id: string;
            'span.type': string;
            label: string;
            groupedConnections: Array<
              | {
                  'service.name': string;
                  'service.environment': string | null;
                  'agent.name': string;
                  serviceAnomalyStats?:
                    | import('./../../../common/anomaly_detection/index').ServiceAnomalyStats
                    | undefined;
                  label: string | undefined;
                  id?: string | undefined;
                  parent?: string | undefined;
                  position?:
                    | import('./../../../../../../node_modules/@types/cytoscape/index').Position
                    | undefined;
                }
              | {
                  'span.destination.service.resource': string;
                  'span.type': string;
                  'span.subtype': string;
                  label: string | undefined;
                  id?: string | undefined;
                  parent?: string | undefined;
                  position?:
                    | import('./../../../../../../node_modules/@types/cytoscape/index').Position
                    | undefined;
                }
              | {
                  id: string;
                  source: string | undefined;
                  target: string | undefined;
                  label: string | undefined;
                  bidirectional?: boolean | undefined;
                  isInverseEdge?: boolean | undefined;
                }
              | undefined
            >;
          };
        }
      | { data: { id: string; source: string; target: string } }
    >;
  }> => {
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
      query: {
        serviceName,
        serviceGroup: serviceGroupId,
        environment,
        start,
        end,
      },
    } = params;

    const {
      savedObjects: { client: savedObjectsClient },
      uiSettings: { client: uiSettingsClient },
    } = await context.core;
    const [mlClient, apmEventClient, serviceGroup, maxNumberOfServices] =
      await Promise.all([
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
      kuery: '',
    });
    return getServiceMap({
      mlClient,
      config,
      apmEventClient,
      serviceName,
      environment,
      searchAggregatedTransactions,
      logger,
      start,
      end,
      maxNumberOfServices,
      serviceGroupKuery: serviceGroup?.kuery,
    });
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
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: import('./../../../common/service_map').NodeStats;
    previousPeriod:
      | import('./../../../common/service_map').NodeStats
      | undefined;
  }> => {
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
      kuery: '',
    });

    const commonProps = {
      environment,
      apmEventClient,
      serviceName,
      searchAggregatedTransactions,
      start,
      end,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceMapServiceNodeInfo(commonProps),
      offset
        ? getServiceMapServiceNodeInfo({ ...commonProps, offset })
        : undefined,
    ]);

    return { currentPeriod, previousPeriod };
  },
});

const serviceMapDependencyNodeRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/dependency',
  params: t.type({
    query: t.intersection([
      t.type({ dependencyName: t.string }),
      environmentRt,
      rangeRt,
      offsetRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: import('./../../../common/service_map').NodeStats;
    previousPeriod:
      | import('./../../../common/service_map').NodeStats
      | undefined;
  }> => {
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
      query: { dependencyName, environment, start, end, offset },
    } = params;

    const commonProps = {
      environment,
      apmEventClient,
      dependencyName,
      start,
      end,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceMapDependencyNodeInfo(commonProps),
      offset
        ? getServiceMapDependencyNodeInfo({ ...commonProps, offset })
        : undefined,
    ]);

    return { currentPeriod, previousPeriod };
  },
});

export const serviceMapRouteRepository = {
  ...serviceMapRoute,
  ...serviceMapServiceNodeRoute,
  ...serviceMapDependencyNodeRoute,
};
