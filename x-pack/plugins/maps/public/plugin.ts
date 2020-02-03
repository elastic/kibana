/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from 'src/core/public';
import { auto } from 'angular';
import { IEmbeddableSetup } from '../../../../src/plugins/embeddable/public';
// @ts-ignore
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory.js';
// @ts-ignore
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { initKibanaServices } from './kibana_services';

export interface MapsPluginSetupDependencies {
  embeddable: IEmbeddableSetup;
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
  private getEmbeddableInjector: (() => Promise<auto.IInjectorService>) | null = null;
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: MapsPluginSetupDependencies) {
    initKibanaServices(plugins);

    // Set up embeddables
    const isEditable = () => core.application.capabilities.get().maps.save as boolean;
    if (!this.getEmbeddableInjector) {
      throw Error('Maps plugin method getEmbeddableInjector is undefined');
    }
    const addBasePath = core.http.basePath.prepend;
    const factory = new MapEmbeddableFactory(
      this.getEmbeddableInjector,
      isEditable,
      addBasePath
    );
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
    plugins.embeddable.registerEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());
  }

  public start(core: CoreStart, plugins: any) {
    // setInspector(plugins.np.inspector);
  }
}
