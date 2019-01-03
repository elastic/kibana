/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import {
  registerListRoute,
  registerAddRoute,
  registerUpdateRoute,
  registerDeleteRoute,
} from './server/routes/api/remote_clusters';

export function remoteClusters(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.remote_clusters',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main', 'index_management'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: [
        'plugins/remote_clusters',
      ],
      injectDefaultVars(server) {
        const config = server.config();
        return {
          remoteClustersUiEnabled: config.get('xpack.remote_clusters.ui.enabled'),
        };
      },
    },

    config(Joi) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true)
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init: function (server) {
      registerLicenseChecker(server);
      registerListRoute(server);
      registerAddRoute(server);
      registerUpdateRoute(server);
      registerDeleteRoute(server);
    }
  });
}
