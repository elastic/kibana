/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/server';
// @ts-ignore
import { getEcommerceSavedObjects } from './sample_data/ecommerce_saved_objects';
// @ts-ignore
import { getFlightsSavedObjects } from './sample_data/flights_saved_objects.js';
// @ts-ignore
import { getWebLogsSavedObjects } from './sample_data/web_logs_saved_objects.js';
import { registerMapsUsageCollector } from './maps_telemetry/collectors/register';
import { APP_ID, APP_ICON, MAP_SAVED_OBJECT_TYPE, getFullPath } from '../common/constants';
import { MapsXPackConfig } from '../config';
import { setStartServices } from './kibana_server_services';
import { emsBoundariesSpecProvider } from './tutorials/ems';
import { initRoutes } from './routes';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import type { EMSSettings } from '../../../../src/plugins/maps_ems/server';
import { setupEmbeddable } from './embeddable';
import { setupSavedObjects } from './saved_objects';
import { registerIntegrations } from './register_integrations';
import { StartDeps, SetupDeps } from './types';

export class MapsPlugin implements Plugin {
  readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>) {
    this._logger = initializerContext.logger.get();
    this._initializerContext = initializerContext;
  }

  _initHomeData(
    home: HomeServerPluginSetup,
    prependBasePath: (path: string) => string,
    emsSettings: EMSSettings
  ) {
    const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
      defaultMessage: 'Map',
    });

    home.sampleData.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());

    home.sampleData.addAppLinksToSampleDataset('ecommerce', [
      {
        sampleObject: {
          type: MAP_SAVED_OBJECT_TYPE,
          id: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
        },
        getPath: getFullPath,
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);

    home.sampleData.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'ecommerce',
      dashboardId: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
      oldEmbeddableId: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
      embeddableId: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
      // @ts-ignore
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: false,
        hiddenLayers: [],
        mapCenter: { lat: 45.88578, lon: -15.07605, zoom: 2.11 },
        openTOCDetails: [],
      },
    });

    home.sampleData.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());

    home.sampleData.addAppLinksToSampleDataset('flights', [
      {
        sampleObject: {
          type: MAP_SAVED_OBJECT_TYPE,
          id: '5dd88580-1906-11e9-919b-ffe5949a18d2',
        },
        getPath: getFullPath,
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);

    home.sampleData.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'flights',
      dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      oldEmbeddableId: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
      embeddableId: '5dd88580-1906-11e9-919b-ffe5949a18d2',
      // @ts-ignore
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: true,
        hiddenLayers: [],
        mapCenter: { lat: 48.72307, lon: -115.18171, zoom: 4.28 },
        openTOCDetails: [],
      },
    });

    home.sampleData.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
    home.sampleData.addAppLinksToSampleDataset('logs', [
      {
        sampleObject: {
          type: MAP_SAVED_OBJECT_TYPE,
          id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
        },
        getPath: getFullPath,
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);
    home.sampleData.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'logs',
      dashboardId: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
      oldEmbeddableId: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
      embeddableId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
      // @ts-ignore
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: false,
        hiddenLayers: [],
        mapCenter: { lat: 42.16337, lon: -88.92107, zoom: 3.64 },
        openTOCDetails: [],
      },
    });

    home.tutorials.registerTutorial(
      emsBoundariesSpecProvider({
        prependBasePath,
        emsLandingPageUrl: emsSettings.getEMSLandingPageUrl(),
      })
    );
  }

  setup(core: CoreSetup, plugins: SetupDeps) {
    const getFilterMigrations = plugins.data.query.filterManager.getAllMigrations.bind(
      plugins.data.query.filterManager
    );

    const { usageCollection, home, features, customIntegrations } = plugins;
    const config$ = this._initializerContext.config.create();

    const emsSettings = plugins.mapsEms.createEMSSettings();

    initRoutes(core, this._logger);

    if (home) {
      this._initHomeData(home, core.http.basePath.prepend, emsSettings);
    }

    if (customIntegrations) {
      registerIntegrations(core, customIntegrations);
    }

    features.registerKibanaFeature({
      id: APP_ID,
      name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
        defaultMessage: 'Maps',
      }),
      order: 400,
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: [APP_ID, 'kibana'],
      catalogue: [APP_ID],
      privileges: {
        all: {
          app: [APP_ID, 'kibana'],
          catalogue: [APP_ID],
          savedObject: {
            all: [MAP_SAVED_OBJECT_TYPE, 'query'],
            read: ['index-pattern', 'tag'],
          },
          ui: ['save', 'show', 'saveQuery'],
        },
        read: {
          app: [APP_ID, 'kibana'],
          catalogue: [APP_ID],
          savedObject: {
            all: [],
            read: [MAP_SAVED_OBJECT_TYPE, 'index-pattern', 'query', 'tag'],
          },
          ui: ['show'],
        },
      },
    });

    setupSavedObjects(core, getFilterMigrations);
    registerMapsUsageCollector(usageCollection);

    setupEmbeddable(plugins.embeddable, getFilterMigrations);

    return {
      config: config$,
    };
  }

  start(core: CoreStart, plugins: StartDeps) {
    setStartServices(core, plugins);
  }
}
