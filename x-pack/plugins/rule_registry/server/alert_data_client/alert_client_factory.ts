/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, KibanaRequest, Logger } from 'src/core/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { SecurityPluginSetup } from '../../../security/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertingAuthorization } from '../../../alerting/server/authorization';
import { AlertsClient } from './alert_client';
import { RacAuthorizationAuditLogger } from './audit_logger';

export interface RacClientFactoryOpts {
  logger: Logger;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  esClient: ElasticsearchClient;
  getAlertingAuthorization: (request: KibanaRequest) => PublicMethodsOf<AlertingAuthorization>;
  securityPluginSetup: SecurityPluginSetup | undefined;
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private getSpaceId!: (request: KibanaRequest) => string | undefined;
  private esClient!: ElasticsearchClient;
  private getAlertingAuthorization!: (
    request: KibanaRequest
  ) => PublicMethodsOf<AlertingAuthorization>;
  private securityPluginSetup!: SecurityPluginSetup | undefined;

  public initialize(options: RacClientFactoryOpts) {
    /**
     * This should be called by the plugin's start() method.
     */
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory (RAC) already initialized');
    }

    this.getAlertingAuthorization = options.getAlertingAuthorization;
    this.isInitialized = true;
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.esClient = options.esClient;
    this.securityPluginSetup = options.securityPluginSetup;
  }

  public async create(request: KibanaRequest): Promise<AlertsClient> {
    const { securityPluginSetup, getAlertingAuthorization, logger } = this;
    const spaceId = this.getSpaceId(request);

    return new AlertsClient({
      spaceId,
      logger,
      authorization: getAlertingAuthorization(request),
      auditLogger: new RacAuthorizationAuditLogger(securityPluginSetup?.audit.asScoped(request)),
      esClient: this.esClient,
    });
  }
}
