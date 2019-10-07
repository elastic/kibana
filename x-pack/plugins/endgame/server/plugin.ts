/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from 'kibana/server';
import { setupEndpointsApi } from './applications/endpoints';
import { PLUGIN_ID } from '../common/constants';

export class EndgameServer implements Plugin {
  constructor(initContext: PluginInitializerContext) {}
  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.routerPath = `/app/${PLUGIN_ID}/_api`;
    setupEndpointsApi(router, core);
  }
  start(core: CoreStart) {}
  stop() {}
}
