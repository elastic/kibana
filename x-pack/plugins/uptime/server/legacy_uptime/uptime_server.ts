/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { createLifecycleRuleTypeFactory, IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { uptimeRequests } from './lib/requests';
import { createRouteWithAuth, legacyUptimeRestApiRoutes, uptimeRouteWrapper } from './routes';
import { UptimeServerSetup, UptimeCorePluginsSetup } from './lib/adapters';

import { statusCheckAlertFactory } from './lib/alerts/status_check';
import { tlsAlertFactory } from './lib/alerts/tls';
import { tlsLegacyAlertFactory } from './lib/alerts/tls_legacy';
import { durationAnomalyAlertFactory } from './lib/alerts/duration_anomaly';
import { licenseCheck } from './lib/domains';

const libs = {
  requests: uptimeRequests,
  license: licenseCheck,
};

export type UMServerLibs = typeof libs;

export const initUptimeServer = (
  server: UptimeServerSetup,
  plugins: UptimeCorePluginsSetup,
  ruleDataClient: IRuleDataClient,
  logger: Logger
) => {
  legacyUptimeRestApiRoutes.forEach((route) => {
    const { method, options, handler, validate, path } = uptimeRouteWrapper(
      createRouteWithAuth(libs, route),
      server
    );

    const routeDefinition = {
      path,
      validate,
      options,
    };

    switch (method) {
      case 'GET':
        server.router.get(routeDefinition, handler);
        break;
      case 'POST':
        server.router.post(routeDefinition, handler);
        break;
      case 'PUT':
        server.router.put(routeDefinition, handler);
        break;
      case 'DELETE':
        server.router.delete(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  });

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
