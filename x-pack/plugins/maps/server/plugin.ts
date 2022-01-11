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
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
// @ts-ignore
import { getEcommerceSavedObjects } from './sample_data/ecommerce_saved_objects';
// @ts-ignore
import { getFlightsSavedObjects } from './sample_data/flights_saved_objects.js';
// @ts-ignore
import { getWebLogsSavedObjects } from './sample_data/web_logs_saved_objects.js';
import { registerMapsUsageCollector } from './maps_telemetry/collectors/register';
import { APP_ID, APP_ICON, MAP_SAVED_OBJECT_TYPE, getFullPath } from '../common/constants';
import { mapSavedObjects, mapsTelemetrySavedObjects } from './saved_objects';
import { MapsXPackConfig } from '../config';
// @ts-ignore
import { setIndexPatternsService, setInternalRepository } from './kibana_server_services';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { emsBoundariesSpecProvider } from './tutorials/ems';
// @ts-ignore
import { initRoutes } from './routes';
import { ILicense } from '../../licensing/common/types';
import { LicensingPluginSetup } from '../../licensing/server';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { MapsEmsPluginSetup } from '../../../../src/plugins/maps_ems/server';
import { EMSSettings } from '../common/ems_settings';
import { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/server';
import { embeddableMigrations } from './embeddable_migrations';

interface SetupDeps {
  features: FeaturesPluginSetupContract;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
  licensing: LicensingPluginSetup;
  mapsEms: MapsEmsPluginSetup;
  embeddable: EmbeddableSetup;
}

export interface StartDeps {
  data: DataPluginStart;
}

export class MapsPlugin implements Plugin {
  readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;
  private readonly _logger: Logger;
  private readonly kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>) {
    this._logger = initializerContext.logger.get();
    this._initializerContext = initializerContext;
    this.kibanaVersion = initializerContext.env.packageInfo.version;
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

  // @ts-ignore
  setup(core: CoreSetup, plugins: SetupDeps) {
    const { usageCollection, home, licensing, features, mapsEms } = plugins;
    const mapsEmsConfig = mapsEms.config;
    const config$ = this._initializerContext.config.create();

    let isEnterprisePlus = false;
    let lastLicenseId: string | undefined;
    const emsSettings = new EMSSettings(mapsEmsConfig, () => isEnterprisePlus);
    licensing.license$.subscribe((license: ILicense) => {
      const enterprise = license.check(APP_ID, 'enterprise');
      isEnterprisePlus = enterprise.state === 'valid';
      lastLicenseId = license.uid;
    });

    initRoutes(core, () => lastLicenseId, emsSettings, this.kibanaVersion, this._logger);

    if (home) {
      this._initHomeData(home, core.http.basePath.prepend, emsSettings);
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

    core.savedObjects.registerType(mapsTelemetrySavedObjects);
    core.savedObjects.registerType(mapSavedObjects);
    registerMapsUsageCollector(usageCollection);

    plugins.embeddable.registerEmbeddableFactory({
      id: MAP_SAVED_OBJECT_TYPE,
      migrations: embeddableMigrations,
    });

    return {
      config: config$,
    };
  }

  // @ts-ignore
  start(core: CoreStart, plugins: StartDeps) {
    setInternalRepository(core.savedObjects.createInternalRepository);
    setIndexPatternsService(
      plugins.data.indexPatterns.indexPatternsServiceFactory,
      core.elasticsearch.client.asInternalUser
    );
  }
}
