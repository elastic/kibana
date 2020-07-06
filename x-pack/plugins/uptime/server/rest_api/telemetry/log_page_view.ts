/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { KibanaTelemetryAdapter } from '../../lib/adapters/telemetry';
import { UMRestApiRouteFactory } from '../types';
import { PageViewParams } from '../../lib/adapters/telemetry/types';
import { API_URLS } from '../../../common/constants';

export const createLogPageViewRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.LOG_PAGE_VIEW,
  validate: {
    body: schema.object({
      page: schema.string(),
      dateStart: schema.string(),
      dateEnd: schema.string(),
      autoRefreshEnabled: schema.boolean(),
      autorefreshInterval: schema.number(),
      refreshTelemetryHistory: schema.maybe(schema.boolean()),
    }),
  },
  handler: async (
    { savedObjectsClient, callES, dynamicSettings },
    _context,
    request,
    response
  ): Promise<any> => {
    const pageView = request.body as PageViewParams;
    if (pageView.refreshTelemetryHistory) {
      KibanaTelemetryAdapter.clearLocalTelemetry();
    }
    await KibanaTelemetryAdapter.countNoOfUniqueMonitorAndLocations(callES, savedObjectsClient);
    const pageViewResult = KibanaTelemetryAdapter.countPageView(pageView as PageViewParams);

    return response.ok({
      body: pageViewResult,
    });
  },
});
