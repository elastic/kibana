/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import {
  invalidLicenseMessage,
  isActivePlatinumLicense,
} from '../../common/service_map';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceMap } from '../lib/service_map/get_service_map';
import { getServiceMapServiceNodeInfo } from '../lib/service_map/get_service_map_service_node_info';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { notifyFeatureUsage } from '../feature';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';

export const serviceMapRoute = createRoute(() => ({
  path: '/api/apm/service-map',
  params: {
    query: t.intersection([
      t.partial({
        environment: t.string,
        serviceName: t.string,
      }),
      rangeRt,
    ]),
  },
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      throw Boom.notFound();
    }
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    notifyFeatureUsage({
      licensingPlugin: context.licensing,
      featureName: 'serviceMaps',
    });

    const logger = context.logger;
    const setup = await setupRequest(context, request);
    const {
      query: { serviceName, environment },
    } = context.params;

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
}));

export const serviceMapServiceNodeRoute = createRoute(() => ({
  path: `/api/apm/service-map/service/{serviceName}`,
  params: {
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([rangeRt, uiFiltersRt]),
  },
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      throw Boom.notFound();
    }
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    const setup = await setupRequest(context, request);

    const {
      path: { serviceName },
    } = context.params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceMapServiceNodeInfo({
      setup,
      serviceName,
      searchAggregatedTransactions,
    });
  },
}));
