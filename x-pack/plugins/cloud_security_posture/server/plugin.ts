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
} from '@kbn/core/server';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { CIS_KUBERNETES_PACKAGE_NAME } from '../common/constants';
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
import { initializeCspRules } from './saved_objects/initialize_rules';
import { initializeCspTransformsIndices } from './create_indices/create_transforms_indices';
import { initializeCspTransforms } from './create_transforms/create_transforms';

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

    const router = core.http.createRouter<CspRequestHandlerContext>();

    // Register server side APIs
    defineRoutes(router, cspAppContext);

    return {};
  }

  public start(core: CoreStart, plugins: CspServerPluginStartDeps): CspServerPluginStart {
    this.CspAppService.start({
      ...plugins.fleet,
    });

    plugins.fleet.fleetSetupCompleted().then(async () => {
      const packageInfo = await plugins.fleet.packageService.asInternalUser.getInstallation(
        CIS_KUBERNETES_PACKAGE_NAME
      );

      // If package is installed we want to make sure all needed assets are installed
      if (packageInfo) {
        this.initialize(core);
      }

      plugins.fleet.registerExternalCallback(
        'packagePolicyPostCreate',
        async (
          packagePolicy: PackagePolicy,
          context: RequestHandlerContext,
          request: KibanaRequest
        ): Promise<PackagePolicy> => {
          if (packagePolicy.package?.name === CIS_KUBERNETES_PACKAGE_NAME) {
            this.initialize(core);
          }

          return packagePolicy;
        }
      );
    });

    return {};
  }

  public stop() {}

  private initialize(core: CoreStart) {
    this.logger.debug('initialize');
    initializeCspRules(core.savedObjects.createInternalRepository());
    initializeCspTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger).then(
      (_) => initializeCspTransforms(core.elasticsearch.client.asInternalUser, this.logger)
    );
  }
}
