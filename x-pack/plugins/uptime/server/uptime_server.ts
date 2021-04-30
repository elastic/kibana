/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMServerLibs } from './lib/lib';
import { createRouteWithAuth, restApiRoutes, uptimeRouteWrapper } from './rest_api';
import { UptimeCoreSetup, UptimeCorePlugins } from './lib/adapters';
import { uptimeAlertTypeFactories } from './lib/alerts';
import { uptimeRuleRegistrySettings } from '../common/rules/uptime_rule_registry_settings';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';

export const initUptimeServer = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => {
  restApiRoutes.forEach((route) =>
    libs.framework.registerRoute(uptimeRouteWrapper(createRouteWithAuth(libs, route)))
  );

  const uptimeRuleRegistry = plugins.observability.ruleRegistry.create({
    ...uptimeRuleRegistrySettings,
    fieldMap: uptimeRuleFieldMap,
  });

  uptimeAlertTypeFactories.forEach((alertTypeFactory) =>
    uptimeRuleRegistry.registerType(alertTypeFactory(server, libs, plugins))
  );
};
