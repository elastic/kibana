/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      _inspect: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ savedObjectsClient, uptimeEsClient, request }): Promise<any> => {
    const pageView = request.body as PageViewParams;
    if (pageView.refreshTelemetryHistory) {
      KibanaTelemetryAdapter.clearLocalTelemetry();
    }
    await KibanaTelemetryAdapter.countNoOfUniqueMonitorAndLocations(
      uptimeEsClient,
      savedObjectsClient
    );
    await KibanaTelemetryAdapter.countNoOfUniqueFleetManagedMonitors(uptimeEsClient);
    return KibanaTelemetryAdapter.countPageView(pageView as PageViewParams);
  },
});
