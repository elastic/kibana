/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage } from '../../../common/service_map';
import { notifyFeatureUsage } from '../../feature';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getServiceMap } from './get_service_map';
import { getServiceMapBackendNodeInfo } from './get_service_map_backend_node_info';
import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt } from '../default_api_types';
import { getServiceGroup } from '../service_groups/get_service_group';
import { offsetRt } from '../../../common/offset_rt';

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

    const savedObjectsClient = (await context.core).savedObjects.client;
    const [setup, serviceGroup] = await Promise.all([
      setupRequest(resources),
      serviceGroupId
        ? getServiceGroup({
            savedObjectsClient,
            serviceGroupId,
          })
        : Promise.resolve(null),
    ]);

    const serviceNames = [
      ...(serviceName ? [serviceName] : []),
      ...(serviceGroup?.serviceNames ?? []),
    ];

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });
    return getServiceMap({
      setup,
      serviceNames,
      environment,
      searchAggregatedTransactions,
      logger,
      start,
      end,
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
    const setup = await setupRequest(resources);

    const {
      path: { serviceName },
      query: { environment, start, end, offset },
    } = params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });

    const commonProps = {
      environment,
      setup,
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

const serviceMapBackendNodeRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/backend',
  params: t.type({
    query: t.intersection([
      t.type({ backendName: t.string }),
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
    const setup = await setupRequest(resources);

    const {
      query: { backendName, environment, start, end, offset },
    } = params;

    const commonProps = { environment, setup, backendName, start, end };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceMapBackendNodeInfo(commonProps),
      offset
        ? getServiceMapBackendNodeInfo({ ...commonProps, offset })
        : undefined,
    ]);

    return { currentPeriod, previousPeriod };
  },
});

export const serviceMapRouteRepository = {
  ...serviceMapRoute,
  ...serviceMapServiceNodeRoute,
  ...serviceMapBackendNodeRoute,
};
