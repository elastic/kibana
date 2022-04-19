/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Setup as InspectorSetupContract } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { SavedObjectsStart } from '@kbn/saved-objects-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import {
  createRegionMapFn,
  regionMapRenderer,
  regionMapVisType,
  createTileMapFn,
  tileMapRenderer,
  tileMapVisType,
} from './legacy_visualizations';
import {
  MapsAppLocatorDefinition,
  MapsAppRegionMapLocatorDefinition,
  MapsAppTileMapLocatorDefinition,
} from './locators';
import { registerLicensedFeatures, setLicensingPluginStart } from './licensed_features';
import { registerSource } from './classes/sources/source_registry';
import { registerLayerWizardExternal } from './classes/layers';
import {
  createLayerDescriptors,
  MapsSetupApi,
  MapsStartApi,
  suggestEMSTermJoinConfig,
} from './api';
import { lazyLoadMapModules } from './lazy_load_bundle';
import { getAppTitle } from '../common/i18n_getters';
import { MapsXPackConfig, MapsConfigType } from '../config';
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory';
import { filterByMapExtentAction } from './trigger_actions/filter_by_map_extent_action';
import { visualizeGeoFieldAction } from './trigger_actions/visualize_geo_field_action';
import { APP_ICON_SOLUTION, APP_ID, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { setIsCloudEnabled, setMapAppConfig, setStartServices } from './kibana_services';
import { MapInspectorView } from './inspector/map_inspector_view';

import { setupLensChoroplethChart } from './lens';

export interface MapsPluginSetupDependencies {
  cloud?: CloudSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  inspector: InspectorSetupContract;
  home?: HomePublicPluginSetup;
  lens: LensPublicSetup;
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  screenshotMode: ScreenshotModePluginSetup;
}

export interface MapsPluginStartDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  embeddable: EmbeddableStart;
  fieldFormats: FieldFormatsStart;
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
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  mapsEms: MapsEmsPluginPublicStart;
  usageCollection?: UsageCollectionSetup;
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
    >
{
  readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<MapsPluginStartDependencies, MapsPluginStart>,
    plugins: MapsPluginSetupDependencies
  ): MapsSetupApi {
    registerLicensedFeatures(plugins.licensing);

    const config = this._initializerContext.config.get<MapsConfigType>();
    setMapAppConfig({
      ...config,

      // Override this when we know we are taking a screenshot (i.e. no user interaction)
      // to avoid a blank-canvas issue when rendering maps on a PDF
      preserveDrawingBuffer: plugins.screenshotMode.isScreenshotMode()
        ? true
        : config.preserveDrawingBuffer,
    });

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

    plugins.inspector.registerView(MapInspectorView);
    if (plugins.home) {
      plugins.home.featureCatalogue.register(featureCatalogueEntry);
    }
    plugins.visualizations.registerAlias(getMapsVisTypeAlias(plugins.visualizations));
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

    setupLensChoroplethChart(core, plugins.expressions, plugins.lens);

    // register wrapper around legacy tile_map and region_map visualizations
    plugins.expressions.registerFunction(createRegionMapFn);
    plugins.expressions.registerRenderer(regionMapRenderer);
    plugins.visualizations.createBaseVisualization(regionMapVisType);
    plugins.expressions.registerFunction(createTileMapFn);
    plugins.expressions.registerRenderer(tileMapRenderer);
    plugins.visualizations.createBaseVisualization(tileMapVisType);

    setIsCloudEnabled(!!plugins.cloud?.isCloudEnabled);

    return {
      registerLayerWizard: registerLayerWizardExternal,
      registerSource,
    };
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
      suggestEMSTermJoinConfig,
    };
  }
}
