/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { createRoute } from './create_route';
import {
  invalidLicenseMessage,
  isValidPlatinumLicense,
} from '../../common/service_map';
import { setupRequest } from '../lib/helpers/setup_request';
import { getClientMetrics } from '../lib/rum_client/get_client_metrics';
import { rangeRt } from './default_api_types';
import { getImpressionTrends } from '../lib/rum_client/get_impression_trends';
import { getPageLoadDistribution } from '../lib/rum_client/get_page_load_distribution';

export const rumClientMetricsRoute = createRoute(() => ({
  path: '/api/apm/rum-client/metrics',
  handler: async ({ context, request }) => {
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const setup = await setupRequest(context, request);
    const {
      query: { serviceName, environment },
    } = context.params;
    return getClientMetrics({ setup, serviceName, environment });
  },
}));

export const rumPageLoadDistributionRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-load-distribution',
  handler: async ({ context, request }) => {
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const setup = await setupRequest(context, request);
    const {
      query: { serviceName, environment },
    } = context.params;
    return getPageLoadDistribution({ setup, serviceName, environment });
  },
}));

export const rumImpressionTrendRoute = createRoute(() => ({
  path: '/api/apm/rum-client/impression-trend',
  handler: async ({ context, request }) => {
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const setup = await setupRequest(context, request);
    const {
      query: { serviceName, environment },
    } = context.params;
    return getImpressionTrends({ setup, serviceName, environment });
  },
}));
