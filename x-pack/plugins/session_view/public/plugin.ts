/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { SessionViewConfigType } from './types';

export class SessionViewPlugin implements Plugin {
  private kibanaVersion: string;

  /** 
   * Initialize SessionViewPlugin class properties (logger, etc) that is accessible
   * through the initializerContext.
   */
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup) {
    const kibanaVersion = this.kibanaVersion;
    const config = this.initializerContext.config.get<SessionViewConfigType>();

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const [coreStart, startDepsServices] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({
          coreStart,
          config,
          depsServices: startDepsServices,
          appMountParams: params,
          version: kibanaVersion,
        });
      },
    });
  }

  public start(core: CoreStart) {
    // NO-OP
    return {};
  }
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public stop() {}
}
