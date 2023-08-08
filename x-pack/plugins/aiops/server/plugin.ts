/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { CASES_ATTACHMENT_CHANGE_POINT_CHART } from '../common/constants';
import { isActiveLicense } from './lib/license';
import {
  AiopsLicense,
  AiopsPluginSetup,
  AiopsPluginStart,
  AiopsPluginSetupDeps,
  AiopsPluginStartDeps,
} from './types';

import { defineLogRateAnalysisRoute } from './routes';
import { defineLogCategorizationRoutes } from './routes/log_categorization';

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
    core.getStartServices().then(([coreStart, depsStart]) => {
      defineLogRateAnalysisRoute(router, aiopsLicense, this.logger, coreStart);
      defineLogCategorizationRoutes(router, aiopsLicense);
    });

    if (plugins.cases) {
      plugins.cases.attachmentFramework.registerPersistableState({
        id: CASES_ATTACHMENT_CHANGE_POINT_CHART,
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
