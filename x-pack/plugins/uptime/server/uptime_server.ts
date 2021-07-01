/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { createUptimeESClient, UMServerLibs } from './lib/lib';
import { createRouteWithAuth, restApiRoutes, uptimeRouteWrapper } from './rest_api';
import { UptimeCoreSetup, UptimeCorePlugins } from './lib/adapters';
import { uptimeAlertTypeFactories } from './lib/alerts';
import { createLifecycleRuleTypeFactory, RuleDataClient } from '../../rule_registry/server';
import { savedObjectsAdapter } from './lib/saved_objects';

import {
  statusCheckAlertFactory,
  ActionGroupIds as statusCheckActionGroup,
} from './lib/alerts/status_check';
import { tlsAlertFactory, ActionGroupIds as tlsActionGroup } from './lib/alerts/tls';
import {
  tlsLegacyAlertFactory,
  ActionGroupIds as tlsLegacyActionGroup,
} from './lib/alerts/tls_legacy';
import {
  durationAnomalyAlertFactory,
  ActionGroupIds as durationAnomalyActionGroup,
} from './lib/alerts/duration_anomaly';

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
  registerType(createLifecycleRuleType(tlsLegacyAlert));
  registerType(createLifecycleRuleType(tlsAlert));
  registerType(createLifecycleRuleType(durationAlert));
};
