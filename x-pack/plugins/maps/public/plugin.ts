/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
import type { UiActionsStart } from 'src/plugins/ui_actions/public';
import type { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import type { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import type { DashboardStart } from 'src/plugins/dashboard/public';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import type { FieldFormatsStart } from 'src/plugins/field_formats/public';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { MapInspectorView } from './inspector/map_inspector_view';
import { setIsCloudEnabled, setMapAppConfig, setStartServices } from './kibana_services';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../../src/plugins/visualizations/public';
import type { Plugin as ExpressionsPublicPlugin } from '../../../../src/plugins/expressions/public';
import { APP_ICON_SOLUTION, APP_ID, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '../../../../src/plugins/ui_actions/public';
import { visualizeGeoFieldAction } from './trigger_actions/visualize_geo_field_action';
import { filterByMapExtentAction } from './trigger_actions/filter_by_map_extent_action';
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory';
import type { EmbeddableSetup, EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { CONTEXT_MENU_TRIGGER } from '../../../../src/plugins/embeddable/public';
import { MapsXPackConfig, MapsConfigType } from '../config';
import { getAppTitle } from '../common/i18n_getters';
import { lazyLoadMapModules } from './lazy_load_bundle';
import {
  createLayerDescriptors,
  MapsSetupApi,
  MapsStartApi,
  suggestEMSTermJoinConfig,
} from './api';
import { registerLayerWizardExternal } from './classes/layers';
import { registerSource } from './classes/sources/source_registry';
import type { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import type { MapsEmsPluginPublicStart } from '../../../../src/plugins/maps_ems/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { UnifiedSearchPublicPluginStart } from '../../../../src/plugins/unified_search/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/public';
import type { FileUploadPluginStart } from '../../file_upload/public';
import type { SavedObjectsStart } from '../../../../src/plugins/saved_objects/public';
import type { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public';
import { registerLicensedFeatures, setLicensingPluginStart } from './licensed_features';
import type { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public';
import type { ChartsPluginStart } from '../../../../src/plugins/charts/public';
import {
  MapsAppLocatorDefinition,
  MapsAppRegionMapLocatorDefinition,
  MapsAppTileMapLocatorDefinition,
} from './locators';
import {
  createRegionMapFn,
  regionMapRenderer,
  regionMapVisType,
  createTileMapFn,
  tileMapRenderer,
  tileMapVisType,
} from './legacy_visualizations';
import type { SecurityPluginStart } from '../../security/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type { CloudSetup } from '../../cloud/public';
import type { LensPublicSetup } from '../../lens/public';

import { setupLensChoroplethChart } from './lens';
import { SharedUXPluginStart } from '../../../../src/plugins/shared_ux/public';
import { ScreenshotModePluginSetup } from '../../../../src/plugins/screenshot_mode/public';

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
  sharedUX: SharedUXPluginStart;
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
