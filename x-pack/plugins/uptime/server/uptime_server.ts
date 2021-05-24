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

  uptimeAlertTypeFactories.forEach((alertTypeFactory) => {
    const alertType = alertTypeFactory(server, libs, plugins);
    const createLifecycleRuleType = createLifecycleRuleTypeFactory({
      ruleDataClient,
      logger,
    });

    return plugins.alerting.registerType(
      createLifecycleRuleType({
        ...alertType,
        producer: 'uptime',
        executor: async ({ services, ...rest }) => {
          const { scopedClusterClient, savedObjectsClient } = services;
          const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
            savedObjectsClient
          );

          const uptimeEsClient = createUptimeESClient({
            esClient: scopedClusterClient.asCurrentUser,
            savedObjectsClient,
          });

          return alertType.executor({
            ...rest,
            services: {
              ...services,
              uptimeEsClient,
              dynamicSettings,
            },
          });
        },
      })
    );
  });
};
