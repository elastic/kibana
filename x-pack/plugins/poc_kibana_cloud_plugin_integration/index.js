/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common';
import { registeApiRoutes } from './server/routes/api';

export function pocKibanaCloudPlugin(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.poc_kibana_cloud_plugin_integration',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: [
        'plugins/poc_kibana_cloud_plugin_integration',
      ],
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
    isEnabled() {
      return true;
    },
    init: function (server) {
      registeApiRoutes(server);
    }
  });
}
