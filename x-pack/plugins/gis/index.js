/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initRoutes } from './server/routes';
import { kySaltTrucksSpecProvider } from './server/sample_data/ky_salt_trucks';

export function gis(kibana) {

  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'gis',
    configPrefix: 'xpack.gis',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'GIS',
        description: 'Map application',
        main: 'plugins/gis/index',
        icon: 'plugins/gis/icon.svg'
      },
      home: ['plugins/gis/register_feature'],
      mappings: require('./mappings.json'),
    },
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      initRoutes(server);

      server.registerSampleDataset(kySaltTrucksSpecProvider);

      server.injectUiAppVars('gis', async () => {
        return await server.getInjectedUiAppVars('kibana');
      });

    }
  });
}
