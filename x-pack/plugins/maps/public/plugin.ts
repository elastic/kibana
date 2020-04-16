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
  setInjectedMetadata,
} from './kibana_services';

export interface MapsPluginSetupDependencies {
  inspector: InspectorSetupContract;
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
  setInjectedMetadata(core.injectedMetadata);
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
  public setup(core: CoreSetup, plugins: MapsPluginSetupDependencies) {
    plugins.inspector.registerView(MapView);
  }

  public start(core: CoreStart, plugins: any) {}
}
