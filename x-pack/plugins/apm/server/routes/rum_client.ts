/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from 'boom';
import { createRoute } from './create_route';
import {
  invalidLicenseMessage,
  isValidPlatinumLicense,
} from '../../common/service_map';
import { setupRequest } from '../lib/helpers/setup_request';
import { getClientMetrics } from '../lib/rum_client/get_client_metrics';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { getImpressionTrends } from '../lib/rum_client/get_impression_trends';
import { getPageLoadDistribution } from '../lib/rum_client/get_page_load_distribution';

export const rumClientMetricsRoute = createRoute(() => ({
  path: '/api/apm/rum/client-metrics',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const setup = await setupRequest(context, request);

    return getClientMetrics({ setup });
  },
}));

export const rumPageLoadDistributionRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-load-distribution',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const setup = await setupRequest(context, request);

    return getPageLoadDistribution({ setup });
  },
}));

export const rumImpressionTrendRoute = createRoute(() => ({
  path: '/api/apm/rum-client/impression-trend',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    if (!isValidPlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const setup = await setupRequest(context, request);
    return getImpressionTrends({ setup });
  },
}));
