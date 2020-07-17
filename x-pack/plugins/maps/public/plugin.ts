/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
// @ts-ignore
import { MapView } from './inspector/views/map_view';
import {
  setAutocompleteService,
  setCore,
  setCoreChrome,
  setCoreI18n,
  setCoreOverlays,
  setData,
  setDocLinks,
  setFileUpload,
  setHttp,
  setIndexPatternSelect,
  setIndexPatternService,
  setInspector,
  setIsGoldPlus,
  setKibanaCommonConfig,
  setKibanaVersion,
  setLicenseId,
  setMapAppConfig,
  setMapsCapabilities,
  setNavigation,
  setSavedObjectsClient,
  setSearchService,
  setTimeFilter,
  setToasts,
  setUiActions,
  setUiSettings,
  setVisualizations,
} from './kibana_services';
import { featureCatalogueEntry } from './feature_catalogue_entry';
// @ts-ignore
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { VisualizationsSetup } from '../../../../src/plugins/visualizations/public';
import { APP_ICON, APP_ID, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/public';
import { MapsXPackConfig, MapsConfigType } from '../config';
import { getAppTitle } from '../common/i18n_getters';
import { ILicense } from '../../licensing/common/types';
import { lazyLoadMapModules } from './lazy_load_bundle';
import { MapsStartApi } from './api';
import { createSecurityLayerDescriptors, registerLayerWizard, registerSource } from './api';

export interface MapsPluginSetupDependencies {
  inspector: InspectorSetupContract;
  home: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
  mapsLegacy: { config: unknown };
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsPluginStartDependencies {}

export const bindSetupCoreAndPlugins = (
  core: CoreSetup,
  plugins: any,
  config: MapsConfigType,
  kibanaVersion: string
) => {
  const { licensing, mapsLegacy } = plugins;
  const { uiSettings, http, notifications } = core;
  if (licensing) {
    licensing.license$.subscribe(({ uid }: { uid: string }) => setLicenseId(uid));
  }
  setHttp(http);
  setToasts(notifications.toasts);
  setVisualizations(plugins.visualizations);
  setUiSettings(uiSettings);
  setKibanaCommonConfig(mapsLegacy.config);
  setMapAppConfig(config);
  setKibanaVersion(kibanaVersion);
};

export const bindStartCoreAndPlugins = (core: CoreStart, plugins: any) => {
  const { fileUpload, data, inspector, licensing } = plugins;
  if (licensing) {
    licensing.license$.subscribe((license: ILicense) => {
      const gold = license.check(APP_ID, 'gold');
      setIsGoldPlus(gold.state === 'valid');
    });
  }

  setInspector(inspector);
  setFileUpload(fileUpload);
  setIndexPatternSelect(data.ui.IndexPatternSelect);
  setTimeFilter(data.query.timefilter.timefilter);
  setSearchService(data.search);
  setIndexPatternService(data.indexPatterns);
  setAutocompleteService(data.autocomplete);
  setCore(core);
  setSavedObjectsClient(core.savedObjects.client);
  setCoreChrome(core.chrome);
  setCoreOverlays(core.overlays);
  setMapsCapabilities(core.application.capabilities.maps);
  setDocLinks(core.docLinks);
  setData(plugins.data);
  setUiActions(plugins.uiActions);
  setNavigation(plugins.navigation);
  setCoreI18n(core.i18n);
};

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
    const config = this._initializerContext.config.get<MapsConfigType>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;
    const { inspector, home, visualizations, embeddable } = plugins;
    bindSetupCoreAndPlugins(core, plugins, config, kibanaVersion);

    inspector.registerView(MapView);
    home.featureCatalogue.register(featureCatalogueEntry);
    visualizations.registerAlias(getMapsVisTypeAlias());
    embeddable.registerEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());

    core.application.register({
      id: APP_ID,
      title: getAppTitle(),
      order: 4000,
      icon: `plugins/${APP_ID}/icon.svg`,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.kibana,
      // @ts-expect-error
      async mount(context, params) {
        const [coreStart, startPlugins] = await core.getStartServices();
        bindStartCoreAndPlugins(coreStart, startPlugins);
        const { renderApp } = await lazyLoadMapModules();
        return renderApp(context, params);
      },
    });
  }

  public start(core: CoreStart, plugins: any): MapsStartApi {
    bindStartCoreAndPlugins(core, plugins);
    return {
      createSecurityLayerDescriptors,
      registerLayerWizard,
      registerSource,
    };
  }
}
