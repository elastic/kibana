/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { take } from 'rxjs/operators';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { getEcommerceSavedObjects } from './sample_data/ecommerce_saved_objects';
import { getFlightsSavedObjects } from './sample_data/flights_saved_objects.js';
import { getWebLogsSavedObjects } from './sample_data/web_logs_saved_objects.js';
import { registerMapsUsageCollector } from './maps_telemetry/collectors/register';
import { APP_ID, APP_ICON, MAP_SAVED_OBJECT_TYPE, createMapPath } from '../common/constants';
import { mapSavedObjects, mapsTelemetrySavedObjects } from './saved_objects';
import { ConfigSchema } from '../../../../src/plugins/maps_legacy/config';
import { setInternalRepository } from './kibana_server_services';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { emsBoundariesSpecProvider } from './tutorials/ems';

interface SetupDeps {
  features: FeaturesPluginSetupContract;
  usageCollection: UsageCollectionSetup;
}

export class MapsPlugin implements Plugin {
  readonly _initializerContext: PluginInitializerContext<ConfigSchema>;
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this._logger = initializerContext.logger.get();
    this._initializerContext = initializerContext;
  }

  _initSampleData(home, prependBasePath, mapConfig) {
    const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
      defaultMessage: 'Map',
    });
    if (home) {
      home.sampleData.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());

      home.sampleData.addAppLinksToSampleDataset('ecommerce', [
        {
          path: createMapPath('2c9c1f60-1909-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: APP_ICON,
        },
      ]);

      home.sampleData.replacePanelInSampleDatasetDashboard({
        sampleDataId: 'ecommerce',
        dashboardId: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
        oldEmbeddableId: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
        embeddableId: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
        embeddableType: 'map',
        embeddableConfig: {
          isLayerTOCOpen: false,
        },
      });

      home.sampleData.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());

      home.sampleData.addAppLinksToSampleDataset('flights', [
        {
          path: createMapPath('5dd88580-1906-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: APP_ICON,
        },
      ]);

      home.sampleData.replacePanelInSampleDatasetDashboard({
        sampleDataId: 'flights',
        dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
        oldEmbeddableId: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
        embeddableId: '5dd88580-1906-11e9-919b-ffe5949a18d2',
        embeddableType: MAP_SAVED_OBJECT_TYPE,
        embeddableConfig: {
          isLayerTOCOpen: true,
        },
      });

      home.sampleData.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
      home.sampleData.addAppLinksToSampleDataset('logs', [
        {
          path: createMapPath('de71f4f0-1902-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: APP_ICON,
        },
      ]);
      home.sampleData.replacePanelInSampleDatasetDashboard({
        sampleDataId: 'logs',
        dashboardId: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
        oldEmbeddableId: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
        embeddableId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
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

  async setup(core: CoreSetup, plugins: SetupDeps) {
    const { usageCollection, home } = plugins;
    // @ts-ignore
    const config$ = this._initializerContext.config.create();
    const currentConfig = await config$.pipe(take(1)).toPromise();

    const mapsEnabled = currentConfig.enabled;
    // TODO: Consider dynamic way to disable maps app on config change
    if (!mapsEnabled) {
      this._logger.warn('Maps app disabled by configuration');
      return;
    }
    this._initSampleData(home, core.http.basePath.prepend, currentConfig);
    plugins.features.registerFeature({
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

  start(core: CoreStart) {
    setInternalRepository(core.savedObjects.createInternalRepository);
  }
}
