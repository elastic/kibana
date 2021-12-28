/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createStore, Reducer } from 'redux';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { SessionViewTableProcessTree } from './components/SessionViewTableProcessTree';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { SessionViewConfigType, SessionViewServices } from './types';

const createTimelineStore = (reducer: Reducer) => {
  // No initial state for now
  return createStore(reducer);
};

export class SessionViewPlugin implements Plugin {
  private kibanaVersion: string;

  /**
   * Initialize SessionViewPlugin class properties (logger, etc) that is accessible
   * through the initializerContext.
   */
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup<SessionViewServices, void>) {
    const kibanaVersion = this.kibanaVersion;
    const config = this.initializerContext.config.get<SessionViewConfigType>();

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const [coreStart, startDepsServices] = await core.getStartServices();
        const { timelines } = startDepsServices;
        const store = createTimelineStore(timelines.getTGridReducer());
        timelines.setTGridEmbeddedStore(store);
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
    return {
      getSessionViewTableProcessTree: () => {
        return <SessionViewTableProcessTree />;
      },
    };
  }

  public stop() {}
}
