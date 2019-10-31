/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  AppMountContext,
  AppMountParameters,
} from 'kibana/public';
import { PLUGIN_ID } from '../common/constants';

export class EndgameClient implements Plugin {
  constructor(initContext: PluginInitializerContext) {}
  setup(core: CoreSetup) {
    core.application.register({
      id: PLUGIN_ID,
      title: 'Endgame Security',
      async mount(context: AppMountContext, params: AppMountParameters) {
        const { mountApp } = await import(
          /* webpackChunkName: "endgame-application" */ './application'
        );
        return mountApp(context, params);
      },
    });
  }
  start(core: CoreStart) {}
  stop() {}
}
