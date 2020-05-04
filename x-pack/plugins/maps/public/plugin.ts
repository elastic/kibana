/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
import { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
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
  setInjectedVarFunc,
  setInspector,
  setLicenseId,
  setMapsCapabilities,
  setNavigation,
  setSavedObjectsClient,
  setTimeFilter,
  setToasts,
  setUiActions,
  setUiSettings,
  setVisualizations,
  setSearchService,
} from './kibana_services';
import { featureCatalogueEntry } from './feature_catalogue_entry';
// @ts-ignore
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import { registerLayerWizards } from './layers/load_layer_wizards';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { VisualizationsSetup } from '../../../../src/plugins/visualizations/public';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { MapEmbeddableFactory } from './embeddable';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/public';

export interface MapsPluginSetupDependencies {
  inspector: InspectorSetupContract;
  home: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsPluginStartDependencies {}

export const bindSetupCoreAndPlugins = (core: CoreSetup, plugins: any) => {
  const { licensing } = plugins;
  const { injectedMetadata, uiSettings, http, notifications } = core;
  if (licensing) {
    licensing.license$.subscribe(({ uid }: { uid: string }) => setLicenseId(uid));
  }
  setInjectedVarFunc(injectedMetadata.getInjectedVar);
  setHttp(http);
  setToasts(notifications.toasts);
  setInjectedVarFunc(injectedMetadata.getInjectedVar);
  setVisualizations(plugins.visualizations);
  setUiSettings(uiSettings);
};

export const bindStartCoreAndPlugins = (core: CoreStart, plugins: any) => {
  const { fileUpload, data, inspector } = plugins;
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
  registerLayerWizards();
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
  public setup(core: CoreSetup, plugins: MapsPluginSetupDependencies) {
    const { inspector, home, visualizations, embeddable } = plugins;
    bindSetupCoreAndPlugins(core, plugins);

    inspector.registerView(MapView);
    home.featureCatalogue.register(featureCatalogueEntry);
    visualizations.registerAlias(getMapsVisTypeAlias());
    embeddable.registerEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());
  }

  public start(core: CoreStart, plugins: any) {
    bindStartCoreAndPlugins(core, plugins);
  }
}
