/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { invalidLicenseMessage } from '../../common/service_map';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceMap } from '../lib/service_map/get_service_map';
import { getServiceMapServiceNodeInfo } from '../lib/service_map/get_service_map_service_node_info';
import { createApmServerRoute } from './create_apm_server_route';
import { environmentRt, rangeRt } from './default_api_types';
import { notifyFeatureUsage } from '../feature';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { isActivePlatinumLicense } from '../../common/license_check';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const serviceMapRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/service-map',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
      }),
      environmentRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { config, context, params, logger } = resources;
    if (!config['xpack.apm.serviceMapEnabled']) {
      throw Boom.notFound();
    }
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    notifyFeatureUsage({
      licensingPlugin: context.licensing,
      featureName: 'serviceMaps',
    });

    const setup = await setupRequest(resources);
    const {
      query: { serviceName, environment },
    } = params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );
    return getServiceMap({
      setup,
      serviceName,
      environment,
      searchAggregatedTransactions,
      logger,
    });
  },
});

const serviceMapServiceNodeRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/service-map/service/{serviceName}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { config, context, params } = resources;

    if (!config['xpack.apm.serviceMapEnabled']) {
      throw Boom.notFound();
    }
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    const setup = await setupRequest(resources);

    const {
      path: { serviceName },
      query: { environment },
    } = params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceMapServiceNodeInfo({
      environment,
      setup,
      serviceName,
      searchAggregatedTransactions,
    });
  },
});

export const serviceMapRouteRepository = createApmServerRouteRepository()
  .add(serviceMapRoute)
  .add(serviceMapServiceNodeRoute);
