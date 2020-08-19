/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, Server } from 'hapi';
import { PLUGIN } from '../common/constants/plugin';
import { compose } from './lib/compose/kibana';
import { initUptimeServer } from './uptime_server';
import { UptimeCorePlugins, UptimeCoreSetup } from './lib/adapters/framework';
import { umDynamicSettings } from './lib/saved_objects';

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

export const initServerWithKibana = (server: UptimeCoreSetup, plugins: UptimeCorePlugins) => {
  const { features } = plugins;
  const libs = compose(server);

  features.registerFeature({
    id: PLUGIN.ID,
    name: PLUGIN.NAME,
    order: 1000,
    navLinkId: PLUGIN.ID,
    icon: 'uptimeApp',
    app: ['uptime', 'kibana'],
    catalogue: ['uptime'],
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    alerting: ['xpack.uptime.alerts.tls', 'xpack.uptime.alerts.monitorStatus'],
    privileges: {
      all: {
        app: ['uptime', 'kibana'],
        catalogue: ['uptime'],
        api: ['uptime-read', 'uptime-write', 'lists-all'],
        savedObject: {
          all: [umDynamicSettings.name, 'alert'],
          read: [],
        },
        alerting: {
          all: ['xpack.uptime.alerts.tls', 'xpack.uptime.alerts.monitorStatus'],
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['save', 'configureSettings', 'show', 'alerting:save'],
      },
      read: {
        app: ['uptime', 'kibana'],
        catalogue: ['uptime'],
        api: ['uptime-read', 'lists-read'],
        savedObject: {
          all: ['alert'],
          read: [umDynamicSettings.name],
        },
        alerting: {
          all: ['xpack.uptime.alerts.tls', 'xpack.uptime.alerts.monitorStatus'],
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['show', 'alerting:save'],
      },
    },
  });

  initUptimeServer(server, libs, plugins);
};
