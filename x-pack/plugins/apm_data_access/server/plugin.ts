/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { APMDataAccessConfig } from '.';
import { ApmDataAccessPluginSetup, ApmDataAccessPluginStart } from './types';

export class ApmDataAccessPlugin
  implements Plugin<ApmDataAccessPluginSetup, ApmDataAccessPluginStart>
{
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup): ApmDataAccessPluginSetup {
    // config
    const { indices } = this.initContext.config.get<APMDataAccessConfig>();

    return {
      indices,
    };
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
