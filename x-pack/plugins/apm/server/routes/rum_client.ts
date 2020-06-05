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

export const rumClientRoute = createRoute(() => ({
  path: '/api/apm/rum-client/metrics',
  params: {},
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      throw Boom.notFound();
    }
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
