/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request, Server } from '@hapi/hapi';
import { Logger } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { UPTIME_RULE_TYPES } from '../common/constants/alerts';
import { PLUGIN } from '../common/constants/plugin';
import { compose } from './lib/compose/kibana';
import { initUptimeServer } from './uptime_server';
import { UptimeCorePluginsSetup, UptimeServerSetup } from './lib/adapters/framework';
import { umDynamicSettings } from './lib/saved_objects/uptime_settings';
import { UptimeRuleRegistry } from './plugin';
import { syntheticsMonitorType } from './lib/saved_objects/synthetics_monitor';
import { syntheticsApiKeyObjectType } from './lib/saved_objects/service_api_key';

export interface KibanaRouteOptions {
  path: string;
  method: string;
  vhost?: string | string[];
  handler: (request: Request) => any;
  options: any;
}

export interface KibanaServer extends Server {
  route: (options: KibanaRouteOptions) => void;
}

export const initServerWithKibana = (
  server: UptimeServerSetup,
  plugins: UptimeCorePluginsSetup,
  ruleRegistry: UptimeRuleRegistry,
  logger: Logger
) => {
  const { features } = plugins;
  const libs = compose(server);

  features.registerKibanaFeature({
    id: PLUGIN.ID,
    name: PLUGIN.NAME,
    order: 1000,
    category: DEFAULT_APP_CATEGORIES.observability,
    app: ['uptime', 'kibana', 'synthetics'],
    catalogue: ['uptime'],
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    alerting: UPTIME_RULE_TYPES,
    privileges: {
      all: {
        app: ['uptime', 'kibana', 'synthetics'],
        catalogue: ['uptime'],
        api: ['uptime-read', 'uptime-write', 'lists-all'],
        savedObject: {
          all: [umDynamicSettings.name, syntheticsMonitorType, syntheticsApiKeyObjectType],
          read: [],
        },
        alerting: {
          rule: {
            all: UPTIME_RULE_TYPES,
          },
          alert: {
            all: UPTIME_RULE_TYPES,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['save', 'configureSettings', 'show', 'alerting:save'],
      },
      read: {
        app: ['uptime', 'kibana', 'synthetics'],
        catalogue: ['uptime'],
        api: ['uptime-read', 'lists-read'],
        savedObject: {
          all: [],
          read: [umDynamicSettings.name, syntheticsMonitorType, syntheticsApiKeyObjectType],
        },
        alerting: {
          rule: {
            read: UPTIME_RULE_TYPES,
          },
          alert: {
            read: UPTIME_RULE_TYPES,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['show', 'alerting:save'],
      },
    },
  });

  initUptimeServer(server, libs, plugins, ruleRegistry, logger);
};
