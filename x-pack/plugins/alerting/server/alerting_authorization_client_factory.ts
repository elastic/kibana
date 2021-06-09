/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { ALERTS_FEATURE_ID } from '../common';
import { AlertTypeRegistry } from './types';
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';
import { AlertingAuthorization } from './authorization/alerting_authorization';
import { AlertingAuthorizationAuditLogger } from './authorization/audit_logger';
import { Space } from '../../spaces/server';

export interface AlertingAuthorizationClientFactoryOpts {
  alertTypeRegistry: AlertTypeRegistry;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  features: FeaturesPluginStart;
}

export class AlertingAuthorizationClientFactory {
  private isInitialized = false;
  private alertTypeRegistry!: AlertTypeRegistry;
  private securityPluginStart?: SecurityPluginStart;
  private securityPluginSetup?: SecurityPluginSetup;
  private features!: FeaturesPluginStart;
  private getSpace!: (request: KibanaRequest) => Promise<Space | undefined>;

  public initialize(options: AlertingAuthorizationClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('AlertingAuthorizationClientFactory already initialized');
    }
    this.isInitialized = true;
    this.getSpace = options.getSpace;
    this.alertTypeRegistry = options.alertTypeRegistry;
    this.securityPluginSetup = options.securityPluginSetup;
    this.securityPluginStart = options.securityPluginStart;
    this.features = options.features;
  }

  public create(request: KibanaRequest, exemptConsumerIds: string[] = []): AlertingAuthorization {
    const { securityPluginSetup, securityPluginStart, features } = this;
    return new AlertingAuthorization({
      authorization: securityPluginStart?.authz,
      request,
      getSpace: this.getSpace,
      alertTypeRegistry: this.alertTypeRegistry,
      features: features!,
      auditLogger: new AlertingAuthorizationAuditLogger(
        securityPluginSetup?.audit.getLogger(ALERTS_FEATURE_ID)
      ),
      exemptConsumerIds,
    });
  }
}
