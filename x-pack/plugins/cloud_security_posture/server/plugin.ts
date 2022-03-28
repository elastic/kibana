/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';
import { CspAppService } from './lib/csp_app_services';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
  CspRequestHandlerContext,
} from './types';
import { defineRoutes } from './routes';
import { cspRuleTemplateAssetType } from './saved_objects/csp_rule_template';
import { cspRuleAssetType } from './saved_objects/csp_rule_type';
// import { initializeCspRules } from './saved_objects/initialize_rules';
import { initializeCspRuleTemplates } from './assets/initialize_rule_templates';
import { initializeCspTransformsIndices } from './create_indices/create_transforms_indices';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
} from './fleet_integration/fleet_integration';

export interface CspAppContext {
  logger: Logger;
  service: CspAppService;
}

export class CspPlugin
  implements
    Plugin<
      CspServerPluginSetup,
      CspServerPluginStart,
      CspServerPluginSetupDeps,
      CspServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  private readonly CspAppService = new CspAppService();

  public setup(
    core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>,
    plugins: CspServerPluginSetupDeps
  ): CspServerPluginSetup {
    const cspAppContext: CspAppContext = {
      logger: this.logger,
      service: this.CspAppService,
    };

    core.savedObjects.registerType(cspRuleAssetType);
    core.savedObjects.registerType(cspRuleTemplateAssetType);

    core.getStartServices().then(([coreStart]) => {
      initializeCspRuleTemplates(coreStart.savedObjects.createInternalRepository());
      this.logger.debug('csp rule templates has been installed');
    });

    const router = core.http.createRouter<CspRequestHandlerContext>();

    // Register server side APIs
    defineRoutes(router, cspAppContext);

    return {};
  }

  public async start(
    core: CoreStart,
    plugins: CspServerPluginStartDeps
  ): Promise<CspServerPluginStart> {
    this.CspAppService.start({
      ...plugins.fleet,
    });

    // initializeCspRules(core.savedObjects.createInternalRepository());
    initializeCspTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);

    await plugins.fleet.fleetSetupCompleted;

    plugins.fleet.registerExternalCallback(
      'packagePolicyCreate',
      getPackagePolicyCreateCallback(this.logger)
    );

    plugins.fleet.registerExternalCallback(
      'postPackagePolicyDelete',
      getPackagePolicyDeleteCallback(core.savedObjects.createInternalRepository())
    );
    return {};
  }
  public stop() {}
}
