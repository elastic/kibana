/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { PluginProperties, Request, Server } from 'hapi';
import { Feature } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { PLUGIN } from '../common/constants';
import { compose } from './lib/compose/kibana';
import { initUptimeServer } from './uptime_server';

export interface KibanaRouteOptions {
  path: string;
  method: string;
  vhost?: string | string[];
  handler: (request: Request) => any;
  options: any;
}

interface KibanaPluginProperties extends PluginProperties {
  xpack_main: {
    registerFeature: (feature: Feature) => void;
  };
}

export interface KibanaServer extends Server {
  route: (options: KibanaRouteOptions) => void;
  plugins: KibanaPluginProperties;
}

export const initServerWithKibana = (server: KibanaServer) => {
  const libs = compose(server);
  initUptimeServer(libs);

  const xpackMainPlugin = server.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: PLUGIN.ID,
    name: i18n.translate('xpack.uptime.featureRegistry.uptimeFeatureName', {
      defaultMessage: 'Uptime',
    }),
    navLinkId: PLUGIN.ID,
    catalogue: ['uptime'],
    privileges: {
      read: {
        app: ['uptime', 'kibana'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: [],
      },
    },
  });
};
