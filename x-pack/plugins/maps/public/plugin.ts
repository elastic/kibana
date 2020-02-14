/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
import { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
// @ts-ignore
import { initKibanaServices, setInspector, setInjectedVarFunc } from './kibana_services';

// eslint-disable-line @typescript-eslint/no-empty-interface
export interface MapsPluginSetupDependencies {
  data: DataPublicPluginSetup;
  inspector: InspectorSetupContract;
}
// eslint-disable-line @typescript-eslint/no-empty-interface
export interface MapsPluginStartDependencies {}

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
    initKibanaServices(core, plugins);
    setInspector(plugins.inspector);
    setInjectedVarFunc(core.injectedMetadata.getInjectedVar);
    // core.application.register({
    //   id: 'maps',
    //   title: i18n.translate('xpack.maps.pluginTitle', {
    //     defaultMessage: 'Maps',
    //   }),
    //   async mount(params: AppMountParameters) {
    //     const [coreStart] = await core.getStartServices();
    //     const { renderApp } = await import('./applications/maps');
    //     return renderApp(coreStart, params);
    //   },
    // });
    return {
      maps: 'testing',
    };
  }

  public start(core: CoreStart, plugins: any) {}
}
