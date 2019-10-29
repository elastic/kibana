/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext, CoreSetup, Logger } from '../../../../src/core/server';
import { defineRoutes } from './routes';

export type Setup = void;
export type Start = void;

export class NewsfeedServerPlugin implements Plugin<Setup, Start> {
  private readonly logger: Logger;
  private readonly kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  setup(core: CoreSetup) {
    defineRoutes({
      router: core.http.createRouter(),
      kibanaVersion: this.kibanaVersion,
    });
  }

  start(core: CoreSetup) {
    this.logger.debug('Starting plugin');
  }
}
