/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initRoutes } from './server/routes';
import { kySaltTrucksSpecProvider } from './server/sample_data/ky_salt_trucks';
import mappings from './mappings.json';
import { checkLicense } from './check_license';
import { watchStatusAndLicenseToInitialize } from
  '../../server/lib/watch_status_and_license_to_initialize';

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
      styleSheetPaths: `${__dirname}/public/index.scss`,
      mappings
    },
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;

      watchStatusAndLicenseToInitialize(xpackMainPlugin, thisPlugin,
        async license => {
          if (license) {
            if (license.gis) {
              // TODO: Replace with content to 'activate' app on license verify
              console.info('Valid GIS License');
            } else {
              console.warn('No GIS for YOU!');
            }
            return license;
          }
        });
      xpackMainPlugin.info
        .feature(thisPlugin.id)
        .registerLicenseCheckResultsGenerator(checkLicense);

      initRoutes(server);
      server.registerSampleDataset(kySaltTrucksSpecProvider);
      server.injectUiAppVars('gis', async () => {
        return await server.getInjectedUiAppVars('kibana');
      });
    }
  });
}
