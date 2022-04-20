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
import { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { DeepReadonly } from 'utility-types';
import { DeletePackagePoliciesResponse, PackagePolicy } from '@kbn/fleet-plugin/common';
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
import { initializeCspTransformsIndices } from './create_indices/create_transforms_indices';
import {
  onPackagePolicyPostCreateCallback,
  onPackagePolicyDeleteCallback,
} from './fleet_integration/fleet_integration';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';

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

    initializeCspTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);
    plugins.fleet.fleetSetupCompleted().then(() => {
      plugins.fleet.registerExternalCallback(
        'packagePolicyPostCreate',
        async (
          packagePolicy: PackagePolicy,
          context: RequestHandlerContext,
          request: KibanaRequest
        ): Promise<PackagePolicy> => {
          if (packagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
            await onPackagePolicyPostCreateCallback(
              this.logger,
              packagePolicy,
              context.core.savedObjects.client
            );
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'postPackagePolicyDelete',
        async (deletedPackagePolicies: DeepReadonly<DeletePackagePoliciesResponse>) => {
          for (const deletedPackagePolicy of deletedPackagePolicies) {
            if (deletedPackagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
              await onPackagePolicyDeleteCallback(
                this.logger,
                deletedPackagePolicy,
                core.savedObjects.createInternalRepository()
              );
            }
          }
        }
      );
    });

    return {};
  }
  public stop() {}
}
