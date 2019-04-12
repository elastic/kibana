/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initRoutes } from './server/routes';
import { getEcommerceSavedObjects } from './server/sample_data/ecommerce_saved_objects';
import { getFlightsSavedObjects } from './server/sample_data/flights_saved_objects.js';
import { getWebLogsSavedObjects } from './server/sample_data/web_logs_saved_objects.js';
import mappings from './mappings.json';
import { checkLicense } from './check_license';
import { migrations } from './migrations';
import { watchStatusAndLicenseToInitialize } from
  '../../server/lib/watch_status_and_license_to_initialize';
import { initTelemetryCollection } from './server/maps_telemetry';
import { i18n } from '@kbn/i18n';
import {  APP_ID, APP_ICON, createMapPath } from './common/constants';
import { getAppTitle } from './common/i18n_getters';

export function maps(kibana) {

  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main', 'tile_map', 'task_manager'],
    id: APP_ID,
    configPrefix: 'xpack.maps',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: getAppTitle(),
        description: i18n.translate('xpack.maps.appDescription', {
          defaultMessage: 'Map application'
        }),
        main: 'plugins/maps/index',
        icon: 'plugins/maps/icon.svg',
        euiIconType: APP_ICON,
      },
      injectDefaultVars(server) {
        const serverConfig = server.config();
        const mapConfig = serverConfig.get('map');
        return {
          showMapsInspectorAdapter: serverConfig.get('xpack.maps.showMapsInspectorAdapter'),
          isEmsEnabled: mapConfig.includeElasticMapsService,
        };
      },
      embeddableFactories: [
        'plugins/maps/embeddable/map_embeddable_factory'
      ],
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
      mappings,
      migrations,
    },
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        showMapsInspectorAdapter: Joi.boolean().default(false),
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

      xpackMainPlugin.registerFeature({
        id: 'maps',
        name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
          defaultMessage: 'Maps',
        }),
        icon: APP_ICON,
        navLinkId: 'maps',
        app: [APP_ID, 'kibana'],
        catalogue: ['maps'],
        privileges: {
          all: {
            savedObject: {
              all: ['map'],
              read: ['config', 'index-pattern']
            },
            ui: ['save'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['map', 'config', 'index-pattern']
            },
            ui: [],
          },
        }
      });

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

      const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
        defaultMessage: 'Map'
      });
      server.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());
      server.addAppLinksToSampleDataset('ecommerce', [
        {
          path: createMapPath('2c9c1f60-1909-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: 'gisApp'
        }
      ]);
      server.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());
      server.addAppLinksToSampleDataset('flights', [
        {
          path: createMapPath('5dd88580-1906-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: 'gisApp'
        }
      ]);
      server.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
      server.addAppLinksToSampleDataset('logs', [
        {
          path: createMapPath('de71f4f0-1902-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: 'gisApp'
        }
      ]);
      server.injectUiAppVars('maps', async () => {
        return await server.getInjectedUiAppVars('kibana');
      });
    }
  });
}
