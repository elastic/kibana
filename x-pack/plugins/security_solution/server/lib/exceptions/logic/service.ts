/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ListsServerExtensionRegistrar } from '@kbn/lists-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { registerListsPluginExtensionPoints } from '../../../lists_integration';
import type { ProductFeaturesService } from '../../product_features_service';

export type ExceptionsPrivileges = 'showExceptionsAndValueLists' | 'crudExceptionsAndValueLists';

export interface ExceptionsServiceStartContract {
  logger: Logger;
  registerListsServerExtension?: ListsServerExtensionRegistrar;
  productFeaturesService: ProductFeaturesService;
  security: SecurityPluginStart;
}

export class ExceptionsService {
  private startDependencies: ExceptionsServiceStartContract | null = null;

  public start(dependencies: ExceptionsServiceStartContract) {
    this.startDependencies = dependencies;

    if (this.startDependencies.registerListsServerExtension) {
      const { registerListsServerExtension } = this.startDependencies;

      registerListsPluginExtensionPoints(registerListsServerExtension, this);
    }
  }

  public stop() {}

  public async hasPrivileges(privilege: ExceptionsPrivileges, request?: KibanaRequest) {
    if (!this.startDependencies?.productFeaturesService || !this.startDependencies?.security) {
      throw new Error('ExceptionsService has not been started (ExceptionsService.start())');
    }

    const productFeaturesService = this.startDependencies.productFeaturesService;
    if (!productFeaturesService.isApiPrivilegeEnabled(privilege)) {
      return false;
    }

    const security = this.startDependencies.security;
    if (request && security.authz.mode.useRbacForRequest(request)) {
      const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
      const apiActionName = productFeaturesService.getApiActionName(privilege);

      const { hasAllRequested } = await checkPrivileges({
        kibana: [apiActionName],
      });
      return hasAllRequested;
    }

    return true;
  }
}
