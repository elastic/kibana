/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { FeaturesPluginStart } from '@kbn/features-plugin/server';
import { Space } from '@kbn/spaces-plugin/server';
import { AlertingAuthorization } from './authorization/alerting_authorization';
import { RuleTypeRegistry } from './types';

export interface AlertingAuthorizationClientFactoryOpts {
  ruleTypeRegistry: RuleTypeRegistry;
  securityPluginStart?: SecurityPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  getSpaceId: (request: KibanaRequest) => string;
  features: FeaturesPluginStart;
}

export class AlertingAuthorizationClientFactory {
  private isInitialized = false;
  // The reason this is protected is because we'll get type collisions otherwise because we're using a type guard assert
  // to ensure the options member is instantiated before using it in various places
  // See for more info: https://stackoverflow.com/questions/66206180/typescript-typeguard-attribut-with-method
  protected options?: AlertingAuthorizationClientFactoryOpts;

  public initialize(options: AlertingAuthorizationClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('AlertingAuthorizationClientFactory already initialized');
    }
    this.isInitialized = true;
    this.options = options;
  }

  public async create(request: KibanaRequest): Promise<AlertingAuthorization> {
    this.validateInitialization();

    return AlertingAuthorization.create({
      authorization: this.options.securityPluginStart?.authz,
      request,
      getSpace: this.options.getSpace,
      getSpaceId: this.options.getSpaceId,
      ruleTypeRegistry: this.options.ruleTypeRegistry,
      features: this.options.features,
    });
  }

  private validateInitialization(): asserts this is this & {
    options: AlertingAuthorizationClientFactoryOpts;
  } {
    if (!this.isInitialized || this.options == null) {
      throw new Error(
        'AlertingAuthorizationClientFactory must be initialized before calling create'
      );
    }
  }
}
