/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
import { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
// @ts-ignore
import { setInjectedVarFunc } from './kibana_services';

export interface MapsPluginSetupDependencies {
  data: DataPublicPluginSetup;
  inspector: InspectorSetupContract;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
    setInjectedVarFunc(core.injectedMetadata.getInjectedVar);
  }

  public start(core: CoreStart, plugins: any) {}
}
