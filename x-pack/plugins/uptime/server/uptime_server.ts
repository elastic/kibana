/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMServerLibs } from './lib/lib';
import { createRouteWithAuth, restApiRoutes, uptimeRouteWrapper } from './rest_api';
import { UptimeCoreSetup, UptimeCorePlugins } from './lib/adapters';
import { uptimeAlertTypeFactories } from './lib/alerts';

export const initUptimeServer = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => {
  restApiRoutes.forEach((route) =>
    libs.framework.registerRoute(uptimeRouteWrapper(createRouteWithAuth(libs, route)))
  );

  uptimeAlertTypeFactories.forEach((alertTypeFactory) =>
    plugins.alerts.registerType(alertTypeFactory(server, libs))
  );
};
