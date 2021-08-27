/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '../../../../src/core/server/http/router/request';
import type { Space } from '../../../../src/plugins/spaces_oss/common/types';
import type { PluginStartContract as FeaturesPluginStart } from '../../features/server/plugin';
import type { SecurityPluginSetup, SecurityPluginStart } from '../../security/server/plugin';
import { ALERTS_FEATURE_ID } from '../common';
import { AlertingAuthorization } from './authorization/alerting_authorization';
import { AlertingAuthorizationAuditLogger } from './authorization/audit_logger';
import type { RuleTypeRegistry } from './types';

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
  private securityPluginSetup?: SecurityPluginSetup;
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
    this.securityPluginSetup = options.securityPluginSetup;
    this.securityPluginStart = options.securityPluginStart;
    this.features = options.features;
    this.getSpaceId = options.getSpaceId;
  }

  public create(request: KibanaRequest): AlertingAuthorization {
    const { securityPluginSetup, securityPluginStart, features } = this;
    return new AlertingAuthorization({
      authorization: securityPluginStart?.authz,
      request,
      getSpace: this.getSpace,
      getSpaceId: this.getSpaceId,
      ruleTypeRegistry: this.ruleTypeRegistry,
      features: features!,
      auditLogger: new AlertingAuthorizationAuditLogger(
        securityPluginSetup?.audit.getLogger(ALERTS_FEATURE_ID)
      ),
    });
  }
}
