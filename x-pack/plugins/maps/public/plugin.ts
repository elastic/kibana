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
  setFileUpload,
  setHttp,
  setIndexPatternSelect,
  setIndexPatternService,
  setInjectedVarFunc,
  setInspector,
  setLicenseId,
  setTimeFilter,
  setToasts,
  setUiSettings,
  setSearchService,
  setInjectedMetadata,
  // @ts-ignore
} from './kibana_services';

export interface MapsPluginSetupDependencies {
  inspector: InspectorSetupContract;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsPluginStartDependencies {}

export const bindSetupCoreAndPlugins = (core: CoreSetup, plugins: any) => {
  const { licensing } = plugins;
  const { injectedMetadata, http } = core;
  if (licensing) {
    licensing.license$.subscribe(({ uid }: { uid: string }) => setLicenseId(uid));
  }
  setInjectedVarFunc(injectedMetadata.getInjectedVar);
  setHttp(http);
  setUiSettings(core.uiSettings);
  setInjectedVarFunc(core.injectedMetadata.getInjectedVar);
  setToasts(core.notifications.toasts);
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
