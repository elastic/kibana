/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { getRequestValidation } from '@kbn/core-http-server';
import { INITIAL_REST_VERSION } from '../../common/constants';
import { DynamicSettingsSchema } from './routes/dynamic_settings';
import { UptimeRouter } from '../types';
import { uptimeRequests } from './lib/requests';
import {
  createRouteWithAuth,
  legacyUptimePublicRestApiRoutes,
  legacyUptimeRestApiRoutes,
  uptimeRouteWrapper,
} from './routes';
import { UptimeServerSetup, UptimeCorePluginsSetup } from './lib/adapters';

import { statusCheckAlertFactory } from './lib/alerts/status_check';
import { tlsAlertFactory } from './lib/alerts/tls';
import { tlsLegacyRuleFactory } from './lib/alerts/tls_legacy';
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
  logger: Logger,
  router: UptimeRouter
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
        router.get(routeDefinition, handler);
        break;
      case 'POST':
        router.post(routeDefinition, handler);
        break;
      case 'PUT':
        router.put(routeDefinition, handler);
        break;
      case 'DELETE':
        router.delete(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  });

  legacyUptimePublicRestApiRoutes.forEach((route) => {
    const { method, options, handler, path, ...rest } = uptimeRouteWrapper(
      createRouteWithAuth(libs, route),
      server
    );

    const validate = rest.validate ? getRequestValidation(rest.validate) : rest.validate;

    const routeDefinition = {
      path,
      validate,
      options,
    };

    switch (method) {
      case 'GET':
        router.versioned
          .get({
            access: 'public',
            description: `Get uptime settings`,
            path: routeDefinition.path,
            options: {
              tags: options?.tags,
            },
          })
          .addVersion(
            {
              version: INITIAL_REST_VERSION,
              validate: {
                request: {
                  body: validate ? validate?.body : undefined,
                },
                response: {
                  200: {
                    body: () => DynamicSettingsSchema,
                  },
                },
              },
            },
            handler
          );
        break;
      case 'PUT':
        router.versioned
          .put({
            access: 'public',
            description: `Update uptime settings`,
            path: routeDefinition.path,
            options: {
              tags: options?.tags,
            },
          })
          .addVersion(
            {
              version: INITIAL_REST_VERSION,
              validate: {
                request: {
                  body: validate ? validate?.body : undefined,
                },
                response: {
                  200: {
                    body: () => DynamicSettingsSchema,
                  },
                },
              },
            },
            handler
          );
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  });

  const {
    alerting: { registerType },
  } = plugins;

  const statusAlert = statusCheckAlertFactory(server, libs, plugins);
  const tlsLegacyRule = tlsLegacyRuleFactory(server, libs, plugins);
  const tlsAlert = tlsAlertFactory(server, libs, plugins);
  const durationAlert = durationAnomalyAlertFactory(server, libs, plugins);

  registerType(statusAlert);
  registerType(tlsAlert);
  registerType(durationAlert);

  /* TLS Legacy rule supported at least through 8.0.
   * Not registered with RAC */
  registerType(tlsLegacyRule);
};
