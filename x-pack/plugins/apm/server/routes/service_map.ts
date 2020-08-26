/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import * as t from 'io-ts';
import {
  invalidLicenseMessage,
  isValidPlatinumLicense,
} from '../../common/service_map';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceMap } from '../lib/service_map/get_service_map';
import { getServiceMapServiceNodeInfo } from '../lib/service_map/get_service_map_service_node_info';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { APM_SERVICE_MAPS_FEATURE_NAME } from '../feature';
import { getParsedUiFilters } from '../lib/helpers/convert_ui_filters/get_parsed_ui_filters';

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
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    context.licensing.featureUsage.notifyUsage(APM_SERVICE_MAPS_FEATURE_NAME);

    const logger = context.logger;
    const setup = await setupRequest(context, request);
    const {
      query: { serviceName, environment },
    } = context.params;
    return getServiceMap({ setup, serviceName, environment, logger });
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
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    const logger = context.logger;
    const setup = await setupRequest(context, request);

    const {
      query: { uiFilters: uiFiltersJson },
      path: { serviceName },
    } = context.params;

    const uiFilters = getParsedUiFilters({ uiFilters: uiFiltersJson, logger });

    return getServiceMapServiceNodeInfo({
      setup,
      serviceName,
      uiFilters,
    });
  },
}));
