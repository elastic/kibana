/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initRoutes } from './server/routes';
import ecommerceSavedObjects from './server/sample_data/ecommerce_saved_objects.json';
import fligthsSavedObjects from './server/sample_data/flights_saved_objects.json';
import webLogsSavedObjects from './server/sample_data/web_logs_saved_objects.json';
import mappings from './mappings.json';
import { checkLicense } from './check_license';
import { watchStatusAndLicenseToInitialize } from
  '../../server/lib/watch_status_and_license_to_initialize';
import { initTelemetryCollection } from './server/maps_telemetry';

export function maps(kibana) {

  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main', 'tile_map', 'task_manager'],
    id: 'maps',
    configPrefix: 'xpack.maps',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Maps',
        description: 'Map application',
        main: 'plugins/maps/index',
        icon: 'plugins/maps/icon.svg',
        euiIconType: 'gisApp',
      },
      injectDefaultVars(server) {
        const serverConfig = server.config();
        const mapConfig = serverConfig.get('map');
        return {
          isEmsEnabled: mapConfig.includeElasticMapsService
        };
      },
      inspectorViews: [
        'plugins/maps/inspector/views/register_views',
      ],
      home: ['plugins/maps/register_feature'],
      styleSheetPaths: `${__dirname}/public/index.scss`,
      savedObjectSchemas: {
        'maps-telemetry': {
          isNamespaceAgnostic: true
        }
      },
      mappings
    },
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      const mapsEnabled = server.config().get('xpack.maps.enabled');

      if (!mapsEnabled) {
        server.log(['info', 'maps'], 'Maps app disabled by configuration');
        return;
      }
      initTelemetryCollection(server);

      const xpackMainPlugin = server.plugins.xpack_main;
      let routesInitialized = false;

      watchStatusAndLicenseToInitialize(xpackMainPlugin, this,
        async license => {
          if (license && license.maps && !routesInitialized) {
            routesInitialized = true;
            initRoutes(server, license.uid);
          }
        });

      xpackMainPlugin.info
        .feature(this.id)
        .registerLicenseCheckResultsGenerator(checkLicense);

      server.addSavedObjectsToSampleDataset('ecommerce', ecommerceSavedObjects);
      server.addSavedObjectsToSampleDataset('flights', fligthsSavedObjects);
      server.addSavedObjectsToSampleDataset('logs', webLogsSavedObjects);
      server.injectUiAppVars('maps', async () => {
        return await server.getInjectedUiAppVars('kibana');
      });
    }
  });
}
