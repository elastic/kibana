/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { AIOPS_ENABLED } from '../common';

import { isActiveLicense } from './lib/license';
import {
  AiopsLicense,
  AiopsPluginSetup,
  AiopsPluginStart,
  AiopsPluginSetupDeps,
  AiopsPluginStartDeps,
} from './types';
import { defineExplainLogRateSpikesRoute } from './routes';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  private readonly logger: Logger;
  private licenseSubscription: Subscription | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<AiopsPluginStartDeps, AiopsPluginSetupDeps>,
    plugins: AiopsPluginSetupDeps
  ) {
    this.logger.debug('aiops: Setup');

    // Subscribe to license changes and store the current license in `currentLicense`.
    // This way we can pass on license changes to the route factory having always
    // the current license because it's stored in a mutable attribute.
    const aiopsLicense: AiopsLicense = { isActivePlatinumLicense: false };
    this.licenseSubscription = plugins.licensing.license$.subscribe(async (license) => {
      aiopsLicense.isActivePlatinumLicense = isActiveLicense('platinum', license);
    });

    const router = core.http.createRouter<DataRequestHandlerContext>();

    // Register server side APIs
    if (AIOPS_ENABLED) {
      core.getStartServices().then(([_, depsStart]) => {
        defineExplainLogRateSpikesRoute(router, aiopsLicense, this.logger);
      });
    }

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('aiops: Started');
    return {};
  }

  public stop() {
    this.logger.debug('aiops: Stop');
    this.licenseSubscription?.unsubscribe();
  }
}
