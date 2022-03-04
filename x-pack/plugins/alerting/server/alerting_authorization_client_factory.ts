/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { RuleTypeRegistry } from './types';
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';
import { AlertingAuthorization } from './authorization/alerting_authorization';
import { Space } from '../../spaces/server';

export interface AlertingAuthorizationClientFactoryOpts {
  ruleTypeRegistry: RuleTypeRegistry;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  features: FeaturesPluginStart;
}

export class AlertingAuthorizationClientFactory {
  private isInitialized = false;
  private ruleTypeRegistry!: RuleTypeRegistry;
  private securityPluginStart?: SecurityPluginStart;
  private features!: FeaturesPluginStart;
  private getSpace!: (request: KibanaRequest) => Promise<Space | undefined>;
  private getSpaceId!: (request: KibanaRequest) => string | undefined;

  public initialize(options: AlertingAuthorizationClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('AlertingAuthorizationClientFactory already initialized');
    }
    this.isInitialized = true;
    this.getSpace = options.getSpace;
    this.ruleTypeRegistry = options.ruleTypeRegistry;
    this.securityPluginStart = options.securityPluginStart;
    this.features = options.features;
    this.getSpaceId = options.getSpaceId;
  }

  public create(request: KibanaRequest): AlertingAuthorization {
    const { securityPluginStart, features } = this;
    return new AlertingAuthorization({
      authorization: securityPluginStart?.authz,
      request,
      getSpace: this.getSpace,
      getSpaceId: this.getSpaceId,
      ruleTypeRegistry: this.ruleTypeRegistry,
      features: features!,
    });
  }
}
