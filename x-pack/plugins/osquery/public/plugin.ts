/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
} from 'src/core/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { OsqueryPluginSetup, OsqueryPluginStart, AppPluginStartDependencies } from './types';
import { PLUGIN_NAME } from '../common';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private kibanaVersion: string;
  private storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup): OsqueryPluginSetup {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();

    if (!config.enabled) {
      return {};
    }

    const storage = this.storage;
    const kibanaVersion = this.kibanaVersion;
    // Register an application into the side navigation menu
    core.application.register({
      id: 'osquery',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Load application bundle
        const { renderApp } = await import('./application');
        // Render the application
        return renderApp(
          coreStart,
          depsStart as AppPluginStartDependencies,
          params,
          storage,
          kibanaVersion
        );
      },
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart): OsqueryPluginStart {
    return {};
  }

  public stop() {}
}
