/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Request, Server } from 'hapi';
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

export interface KibanaServer extends Server {
  route: (options: KibanaRouteOptions) => void;
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
    icon: 'uptimeApp',
    app: ['uptime', 'kibana'],
    catalogue: ['uptime'],
    privileges: {
      all: {
        savedObject: {
          all: [],
          read: ['config'],
        },
        // the save ui capability isn't being consumed presently, but we need a way
        // to differentiate which privilege in the future will have elevated privileges
        // so that we know which one to display in the UI in some situations, and to allow
        // the user to choose the Uptime all privilege when they have global read.
        ui: ['save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: [],
      },
    },
  });
};
