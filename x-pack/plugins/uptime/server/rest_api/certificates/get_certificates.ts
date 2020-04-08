/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { KibanaTelemetryAdapter } from '../../lib/adapters/telemetry';
import { UMRestApiRouteFactory } from '../types';
import { PageViewParams } from '../../lib/adapters/telemetry/types';
import { API_URLS } from '../../../../../legacy/plugins/uptime/common/constants';
import { UMServerLibs } from '../../lib/lib';

export const createGetCertificatesRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.CERTIFICATES,
  validate: {
    query: schema.object({
      query: schema.maybe(schema.string()),
      size: schema.maybe(schema.number()),
      sort: schema.maybe(schema.string()),
      status: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { query, size, sort, status } = request.query;

    const result = await libs.requests.getCertificates({
      callES,
      dynamicSettings,
      query,
      size,
      sort,
    });

    return response.ok({
      body: result,
    });
  },
});
