/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ElasticsearchClient } from '../../../../../src/core/server/elasticsearch/client/types';
import { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import { AlertingAuthorization } from '../../../alerting/server/authorization/alerting_authorization';
import type { SecurityPluginSetup } from '../../../security/server/plugin';
import { AlertsClient } from './alerts_client';

export interface AlertsClientFactoryProps {
  logger: Logger;
  esClient: ElasticsearchClient;
  getAlertingAuthorization: (request: KibanaRequest) => PublicMethodsOf<AlertingAuthorization>;
  securityPluginSetup: SecurityPluginSetup | undefined;
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private esClient!: ElasticsearchClient;
  private getAlertingAuthorization!: (
    request: KibanaRequest
  ) => PublicMethodsOf<AlertingAuthorization>;
  private securityPluginSetup!: SecurityPluginSetup | undefined;

  public initialize(options: AlertsClientFactoryProps) {
    /**
     * This should be called by the plugin's start() method.
     */
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory (RAC) already initialized');
    }

    this.getAlertingAuthorization = options.getAlertingAuthorization;
    this.isInitialized = true;
    this.logger = options.logger;
    this.esClient = options.esClient;
    this.securityPluginSetup = options.securityPluginSetup;
  }

  public async create(request: KibanaRequest): Promise<AlertsClient> {
    const { securityPluginSetup, getAlertingAuthorization, logger } = this;

    return new AlertsClient({
      logger,
      authorization: getAlertingAuthorization(request),
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      esClient: this.esClient,
    });
  }
}
