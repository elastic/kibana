/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { take } from 'rxjs/operators';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
// @ts-ignore
import { getEcommerceSavedObjects } from './sample_data/ecommerce_saved_objects';
// @ts-ignore
import { getFlightsSavedObjects } from './sample_data/flights_saved_objects.js';
// @ts-ignore
import { getWebLogsSavedObjects } from './sample_data/web_logs_saved_objects.js';
import { registerMapsUsageCollector } from './maps_telemetry/collectors/register';
import { APP_ID, APP_ICON, MAP_SAVED_OBJECT_TYPE, getExistingMapPath } from '../common/constants';
import { mapSavedObjects, mapsTelemetrySavedObjects } from './saved_objects';
import { MapsXPackConfig } from '../config';
// @ts-ignore
import { setInternalRepository } from './kibana_server_services';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { emsBoundariesSpecProvider } from './tutorials/ems';
// @ts-ignore
import { initRoutes } from './routes';
import { ILicense } from '../../licensing/common/types';
import { LicensingPluginSetup } from '../../licensing/server';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { MapsLegacyPluginSetup } from '../../../../src/plugins/maps_legacy/server';

interface SetupDeps {
  features: FeaturesPluginSetupContract;
  usageCollection: UsageCollectionSetup;
  home: HomeServerPluginSetup;
  licensing: LicensingPluginSetup;
  mapsLegacy: MapsLegacyPluginSetup;
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
    mapConfig: any
  ) {
    const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
      defaultMessage: 'Map',
    });
    if (home) {
      home.sampleData.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());

      home.sampleData.addAppLinksToSampleDataset('ecommerce', [
        {
          path: getExistingMapPath('2c9c1f60-1909-11e9-919b-ffe5949a18d2'),
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
        embeddableType: 'map',
        embeddableConfig: {
          isLayerTOCOpen: false,
        },
      });

      home.sampleData.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());

      home.sampleData.addAppLinksToSampleDataset('flights', [
        {
          path: getExistingMapPath('5dd88580-1906-11e9-919b-ffe5949a18d2'),
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
        },
      });

      home.sampleData.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
      home.sampleData.addAppLinksToSampleDataset('logs', [
        {
          path: getExistingMapPath('de71f4f0-1902-11e9-919b-ffe5949a18d2'),
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
        },
      });

      home.tutorials.registerTutorial(
        emsBoundariesSpecProvider({
          prependBasePath,
          emsLandingPageUrl: mapConfig.emsLandingPageUrl,
        })
      );
    }
  }

  // @ts-ignore
  async setup(core: CoreSetup, plugins: SetupDeps) {
    const { usageCollection, home, licensing, features, mapsLegacy } = plugins;
    // @ts-ignore
    const config$ = this._initializerContext.config.create();
    const mapsLegacyConfig = await mapsLegacy.config$.pipe(take(1)).toPromise();
    const currentConfig = await config$.pipe(take(1)).toPromise();

    // @ts-ignore
    const mapsEnabled = currentConfig.enabled;
    // TODO: Consider dynamic way to disable maps app on config change
    if (!mapsEnabled) {
      this._logger.warn('Maps app disabled by configuration');
      return;
    }

    let routesInitialized = false;
    licensing.license$.subscribe((license: ILicense) => {
      const { state } = license.check('maps', 'basic');
      if (state === 'valid' && !routesInitialized) {
        routesInitialized = true;
        initRoutes(
          core.http.createRouter(),
          license.uid,
          mapsLegacyConfig,
          this.kibanaVersion,
          this._logger
        );
      }
    });

    this._initHomeData(home, core.http.basePath.prepend, currentConfig);

    features.registerFeature({
      id: APP_ID,
      name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
        defaultMessage: 'Maps',
      }),
      order: 600,
      icon: APP_ICON,
      navLinkId: APP_ID,
      app: [APP_ID, 'kibana'],
      catalogue: [APP_ID],
      privileges: {
        all: {
          app: [APP_ID, 'kibana'],
          catalogue: [APP_ID],
          savedObject: {
            all: [MAP_SAVED_OBJECT_TYPE, 'query'],
            read: ['index-pattern'],
          },
          ui: ['save', 'show', 'saveQuery'],
        },
        read: {
          app: [APP_ID, 'kibana'],
          catalogue: [APP_ID],
          savedObject: {
            all: [],
            read: [MAP_SAVED_OBJECT_TYPE, 'index-pattern', 'query'],
          },
          ui: ['show'],
        },
      },
    });

    core.savedObjects.registerType(mapsTelemetrySavedObjects);
    core.savedObjects.registerType(mapSavedObjects);
    registerMapsUsageCollector(usageCollection, currentConfig);

    return {
      config: config$,
    };
  }

  // @ts-ignore
  start(core: CoreStart) {
    setInternalRepository(core.savedObjects.createInternalRepository);
  }
}
