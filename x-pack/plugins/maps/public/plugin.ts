/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { DashboardStart } from 'src/plugins/dashboard/public';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
// @ts-ignore
import { MapView } from './inspector/views/map_view';
import {
  setEMSSettings,
  setKibanaCommonConfig,
  setKibanaVersion,
  setMapAppConfig,
  setStartServices,
} from './kibana_services';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../../src/plugins/visualizations/public';
import { APP_ICON_SOLUTION, APP_ID, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '../../../../src/plugins/ui_actions/public';
import {
  createMapsUrlGenerator,
  createRegionMapUrlGenerator,
  createTileMapUrlGenerator,
} from './url_generator';
import { visualizeGeoFieldAction } from './trigger_actions/visualize_geo_field_action';
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/public';
import { MapsXPackConfig, MapsConfigType } from '../config';
import { getAppTitle } from '../common/i18n_getters';
import { lazyLoadMapModules } from './lazy_load_bundle';
import { MapsStartApi } from './api';
import { createLayerDescriptors, registerLayerWizard, registerSource } from './api';
import { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { MapsEmsPluginSetup } from '../../../../src/plugins/maps_ems/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/public';
import { FileUploadPluginStart } from '../../file_upload/public';
import { SavedObjectsStart } from '../../../../src/plugins/saved_objects/public';
import { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public';
import {
  getIsEnterprisePlus,
  registerLicensedFeatures,
  setLicensingPluginStart,
} from './licensed_features';
import { EMSSettings } from '../common/ems_settings';
import { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';

export interface MapsPluginSetupDependencies {
  inspector: InspectorSetupContract;
  home?: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
  mapsEms: MapsEmsPluginSetup;
  share: SharePluginSetup;
  licensing: LicensingPluginSetup;
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

    // register url generators
    const getStartServices = async () => {
      const [coreStart] = await core.getStartServices();
      return {
        appBasePath: coreStart.application.getUrlForApp('maps'),
        useHashedUrl: coreStart.uiSettings.get('state:storeInSessionStorage'),
      };
    };
    plugins.share.urlGenerators.registerUrlGenerator(createMapsUrlGenerator(getStartServices));
    plugins.share.urlGenerators.registerUrlGenerator(createTileMapUrlGenerator(getStartServices));
    plugins.share.urlGenerators.registerUrlGenerator(createRegionMapUrlGenerator(getStartServices));

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
        const { renderApp } = await lazyLoadMapModules();
        return renderApp(params);
      },
    });
  }

  public start(core: CoreStart, plugins: MapsPluginStartDependencies): MapsStartApi {
    setLicensingPluginStart(plugins.licensing);
    setStartServices(core, plugins);

    if (core.application.capabilities.maps.show) {
      plugins.uiActions.addTriggerAction(VISUALIZE_GEO_FIELD_TRIGGER, visualizeGeoFieldAction);
    }

    if (!core.application.capabilities.maps.save) {
      plugins.visualizations.unRegisterAlias(APP_ID);
    }

    return {
      createLayerDescriptors,
      registerLayerWizard,
      registerSource,
    };
  }
}
