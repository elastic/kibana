/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import type { PassThrough } from 'stream';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage } from '../../../common/service_map/utils';
import { notifyFeatureUsage } from '../../feature';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import type { ServiceMapServiceDependencyInfoResponse } from './get_service_map_dependency_node_info';
import { getServiceMapDependencyNodeInfo } from './get_service_map_dependency_node_info';
import type { ServiceMapServiceNodeInfoResponse } from './get_service_map_service_node_info';
import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt, kueryRt } from '../default_api_types';
import { getServiceGroup } from '../service_groups/get_service_group';
import { offsetRt } from '../../../common/comparison_rt';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

const serviceMapRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map',
  params: t.type({
    query: t.intersection([
      t.type({
        traceIds: t.union([t.array(t.string), t.string]),
      }),
      rangeRt,
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  options: {
    stream: true,
  },
  handler: async (resources): Promise<PassThrough> => {
    const { config, context, params } = resources;
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
      query: { traceIds, start, end },
    } = params;

    const [apmEventClient] = await Promise.all([getApmEventClient(resources)]);

    return fetchServicePathsFromTraceIds({
      traceIds: Array.isArray(traceIds) ? traceIds : [traceIds],
      start,
      end,
      terminateAfter: config.serviceMapTerminateAfter,
      apmEventClient,
    });
  },
});

const serviceMapTraceSampleRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/trace-sample',
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
  handler: async (resources): Promise<{ traceIds: string[] }> => {
    const { config, context, params, logger } = resources;

    const {
      query: { serviceName, serviceGroup: serviceGroupId, environment, start, end, kuery },
    } = params;

    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    const [apmEventClient, serviceGroup] = await Promise.all([
      getApmEventClient(resources),
      serviceGroupId
        ? getServiceGroup({
            savedObjectsClient,
            serviceGroupId,
          })
        : Promise.resolve(null),
    ]);

    logger.debug('Getting trace sample IDs');
    const { traceIds } = await getTraceSampleIds({
      config,
      apmEventClient,
      serviceName,
      environment,
      start,
      end,
      serviceGroupKuery: serviceGroup?.kuery,
      kuery,
    });

    return { traceIds };
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
    query: t.intersection([t.type({ dependencyName: t.string }), environmentRt, rangeRt, offsetRt]),
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
      query: { dependencyName, environment, start, end, offset },
    } = params;

    return getServiceMapDependencyNodeInfo({
      apmEventClient,
      dependencyName,
      start,
      end,
      environment,
      offset,
    });
  },
});

export const serviceMapRouteRepository = {
  ...serviceMapTraceSampleRoute,
  ...serviceMapRoute,
  ...serviceMapServiceNodeRoute,
  ...serviceMapDependencyNodeRoute,
};
