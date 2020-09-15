/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin,
} from '../../../../src/core/server';

export class XpackLegacyPlugin implements Plugin {
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {}

  public stop() {}
}
