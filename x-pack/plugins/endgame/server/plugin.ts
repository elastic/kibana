/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from 'kibana/server';

export class EndgameServer implements Plugin {
  constructor(initContext: PluginInitializerContext) {}
  setup(core: CoreSetup) {}
  start(core: CoreStart) {}
  stop() {}
}
