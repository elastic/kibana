/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { AppMountParameters } from '../../../../src/core/public/application/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils/default_app_categories';
import type { ChartsPluginStart } from '../../../../src/plugins/charts/public/types';
import type { DashboardStart } from '../../../../src/plugins/dashboard/public/plugin_contract';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import { CONTEXT_MENU_TRIGGER } from '../../../../src/plugins/embeddable/public/lib/triggers/triggers';
import type {
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../../src/plugins/embeddable/public/plugin';
import { ExpressionsPublicPlugin } from '../../../../src/plugins/expressions/public/plugin';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public/plugin';
import type {
  Setup as InspectorSetupContract,
  Start as InspectorStartContract,
} from '../../../../src/plugins/inspector/public/plugin';
import type { MapsEmsPluginSetup } from '../../../../src/plugins/maps_ems/public';
import type { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public/types';
import type { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public/types';
import type { SavedObjectsStart } from '../../../../src/plugins/saved_objects/public/plugin';
import type {
  SharePluginSetup,
  SharePluginStart,
} from '../../../../src/plugins/share/public/plugin';
import type { UiActionsStart } from '../../../../src/plugins/ui_actions/public/plugin';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '../../../../src/plugins/ui_actions/public/triggers/visualize_geo_field_trigger';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public/plugin';
import type {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../../src/plugins/visualizations/public/plugin';
import type { FileUploadPluginStart } from '../../file_upload/public/plugin';
import type { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/public/types';
import type { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public/types';
import type { SecurityPluginStart } from '../../security/public/plugin';
import { APP_ICON_SOLUTION, APP_ID, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { EMSSettings } from '../common/ems_settings';
import { getAppTitle } from '../common/i18n_getters';
import type { MapsConfigType, MapsXPackConfig } from '../config';
import { createLayerDescriptors } from './api/create_layer_descriptors';
import { suggestEMSTermJoinConfig } from './api/ems';
import { registerLayerWizard, registerSource } from './api/register';
import type { MapsStartApi } from './api/start_api';
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory';
import { featureCatalogueEntry } from './feature_catalogue_entry';
// @ts-ignore
import { MapView } from './inspector/views/map_view';
import {
  setEMSSettings,
  setKibanaCommonConfig,
  setKibanaVersion,
  setMapAppConfig,
  setStartServices,
} from './kibana_services';
import { lazyLoadMapModules } from './lazy_load_bundle';
import { createRegionMapFn } from './legacy_visualizations/region_map/region_map_fn';
import { regionMapRenderer } from './legacy_visualizations/region_map/region_map_renderer';
import { regionMapVisType } from './legacy_visualizations/region_map/region_map_vis_type';
import { createTileMapFn } from './legacy_visualizations/tile_map/tile_map_fn';
import { tileMapRenderer } from './legacy_visualizations/tile_map/tile_map_renderer';
import { tileMapVisType } from './legacy_visualizations/tile_map/tile_map_vis_type';
import {
  getIsEnterprisePlus,
  registerLicensedFeatures,
  setLicensingPluginStart,
} from './licensed_features';
import {
  MapsAppLocatorDefinition,
  MapsAppRegionMapLocatorDefinition,
  MapsAppTileMapLocatorDefinition,
} from './locators';
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import { filterByMapExtentAction } from './trigger_actions/filter_by_map_extent_action';
import { visualizeGeoFieldAction } from './trigger_actions/visualize_geo_field_action';



export interface MapsPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  inspector: InspectorSetupContract;
  home?: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
  mapsEms: MapsEmsPluginSetup;
  share: SharePluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface MapsPluginStartDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  fileUpload: FileUploadPluginStart;
  inspector: InspectorStartContract;
  licensing: LicensingPluginStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
  visualizations: VisualizationsStart;
  savedObjects: SavedObjectsStart;
  dashboard: DashboardStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  security: SecurityPluginStart;
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type MapsPluginSetup = ReturnType<MapsPlugin['setup']>;
export type MapsPluginStart = ReturnType<MapsPlugin['start']>;

/** @internal */
export class MapsPlugin
  implements
    Plugin<
      MapsPluginSetup,
      MapsPluginStart,
      MapsPluginSetupDependencies,
      MapsPluginStartDependencies
    > {
  readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsPluginSetupDependencies) {
    registerLicensedFeatures(plugins.licensing);

    const config = this._initializerContext.config.get<MapsConfigType>();
    setKibanaCommonConfig(plugins.mapsEms.config);
    setMapAppConfig(config);
    setKibanaVersion(this._initializerContext.env.packageInfo.version);

    const emsSettings = new EMSSettings(plugins.mapsEms.config, getIsEnterprisePlus);
    setEMSSettings(emsSettings);

    const locator = plugins.share.url.locators.create(
      new MapsAppLocatorDefinition({
        useHash: core.uiSettings.get('state:storeInSessionStorage'),
      })
    );
    plugins.share.url.locators.create(
      new MapsAppTileMapLocatorDefinition({
        locator,
      })
    );
    plugins.share.url.locators.create(
      new MapsAppRegionMapLocatorDefinition({
        locator,
      })
    );

    plugins.inspector.registerView(MapView);
    if (plugins.home) {
      plugins.home.featureCatalogue.register(featureCatalogueEntry);
    }
    plugins.visualizations.registerAlias(
      getMapsVisTypeAlias(plugins.visualizations, config.showMapVisualizationTypes)
    );
    plugins.embeddable.registerEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());

    core.application.register({
      id: APP_ID,
      title: getAppTitle(),
      order: 4000,
      icon: `plugins/${APP_ID}/icon.svg`,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.kibana,
      async mount(params: AppMountParameters) {
        const UsageTracker =
          plugins.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
        const { renderApp } = await lazyLoadMapModules();
        return renderApp(params, UsageTracker);
      },
    });

    // register wrapper around legacy tile_map and region_map visualizations
    plugins.expressions.registerFunction(createRegionMapFn);
    plugins.expressions.registerRenderer(regionMapRenderer);
    plugins.visualizations.createBaseVisualization(regionMapVisType);
    plugins.expressions.registerFunction(createTileMapFn);
    plugins.expressions.registerRenderer(tileMapRenderer);
    plugins.visualizations.createBaseVisualization(tileMapVisType);
  }

  public start(core: CoreStart, plugins: MapsPluginStartDependencies): MapsStartApi {
    setLicensingPluginStart(plugins.licensing);
    setStartServices(core, plugins);

    if (core.application.capabilities.maps.show) {
      plugins.uiActions.addTriggerAction(VISUALIZE_GEO_FIELD_TRIGGER, visualizeGeoFieldAction);
    }
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, filterByMapExtentAction);

    if (!core.application.capabilities.maps.save) {
      plugins.visualizations.unRegisterAlias(APP_ID);
    }

    return {
      createLayerDescriptors,
      registerLayerWizard,
      registerSource,
      suggestEMSTermJoinConfig,
    };
  }
}
