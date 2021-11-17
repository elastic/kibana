/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  PluginInitializerContext,
  Plugin as PluginInterface,
  Logger,
  CoreStart,
} from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { commonFunctions } from '../common';

interface PluginsSetup {
  expressions: ExpressionsServerSetup;
}

export class Plugin implements PluginInterface {
  private readonly logger: Logger;
  constructor(public readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup) {
    commonFunctions.map(plugins.expressions.registerFunction);
  }

  public start(coreStart: CoreStart) {}

  public stop() {}
}
