/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart, CoreSetup, Plugin as PluginType } from '@kbn/core/server';

export class Plugin implements PluginType {
  constructor() {}

  public setup(core: CoreSetup, plugins: {}) {
    return {};
  }

  public start(coreStart: CoreStart, pluginsStart: {}) {}

  public stop() {}
}
