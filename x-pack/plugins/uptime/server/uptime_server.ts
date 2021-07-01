/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { createLifecycleRuleTypeFactory, RuleDataClient } from '../../rule_registry/server';
import { UMServerLibs } from './lib/lib';
import { createRouteWithAuth, restApiRoutes, uptimeRouteWrapper } from './rest_api';
import { UptimeCoreSetup, UptimeCorePlugins } from './lib/adapters';

import { statusCheckAlertFactory } from './lib/alerts/status_check';
import { tlsAlertFactory } from './lib/alerts/tls';
import { tlsLegacyAlertFactory } from './lib/alerts/tls_legacy';
import { durationAnomalyAlertFactory } from './lib/alerts/duration_anomaly';

export const initUptimeServer = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins,
  ruleDataClient: RuleDataClient,
  logger: Logger
) => {
  restApiRoutes.forEach((route) =>
    libs.framework.registerRoute(uptimeRouteWrapper(createRouteWithAuth(libs, route)))
  );

  const {
    alerting: { registerType },
  } = plugins;

  const statusAlert = statusCheckAlertFactory(server, libs, plugins);
  const tlsLegacyAlert = tlsLegacyAlertFactory(server, libs, plugins);
  const tlsAlert = tlsAlertFactory(server, libs, plugins);
  const durationAlert = durationAnomalyAlertFactory(server, libs, plugins);

  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  registerType(createLifecycleRuleType(statusAlert));
  registerType(createLifecycleRuleType(tlsAlert));
  registerType(createLifecycleRuleType(durationAlert));

  /* TLS Legacy rule supported at least through 8.0.
   * Not registered with RAC */
  registerType(tlsLegacyAlert);
};
