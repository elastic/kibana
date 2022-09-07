/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

import { GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart } from './types';
import { defineRoutes } from './routes';
import { guidedSetupSavedObjects } from './saved_objects';

export class GuidedOnboardingPlugin
  implements Plugin<GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('guidedOnboarding: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    // register saved objects
    core.savedObjects.registerType(guidedSetupSavedObjects);

    return {};
  }

  public start() {
    this.logger.debug('guidedOnboarding: Started');
    return {};
  }

  public stop() {}
}
