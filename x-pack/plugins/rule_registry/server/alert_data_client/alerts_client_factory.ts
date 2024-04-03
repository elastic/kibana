/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';
import {
  AlertingAuthorization,
  PluginStartContract as AlertingStart,
} from '@kbn/alerting-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { IRuleDataService } from '../rule_data_plugin_service';
import { AlertsClient } from './alerts_client';

export interface AlertsClientFactoryProps {
  logger: Logger;
  esClient: ElasticsearchClient;
  getAlertingAuthorization: (request: KibanaRequest) => PublicMethodsOf<AlertingAuthorization>;
  securityPluginSetup: SecurityPluginSetup | undefined;
  ruleDataService: IRuleDataService | null;
  getRuleType: RuleTypeRegistry['get'];
  getRuleList: RuleTypeRegistry['list'];
  getAlertIndicesAlias: AlertingStart['getAlertIndicesAlias'];
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private esClient!: ElasticsearchClient;
  private getAlertingAuthorization!: (
    request: KibanaRequest
  ) => PublicMethodsOf<AlertingAuthorization>;
  private securityPluginSetup!: SecurityPluginSetup | undefined;
  private ruleDataService!: IRuleDataService | null;
  private getRuleType!: RuleTypeRegistry['get'];
  private getRuleList!: RuleTypeRegistry['list'];
  private getAlertIndicesAlias!: AlertingStart['getAlertIndicesAlias'];

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
    this.ruleDataService = options.ruleDataService;
    this.getRuleType = options.getRuleType;
    this.getRuleList = options.getRuleList;
    this.getAlertIndicesAlias = options.getAlertIndicesAlias;
  }

  public async create(request: KibanaRequest): Promise<AlertsClient> {
    const { securityPluginSetup, getAlertingAuthorization, logger } = this;

    return new AlertsClient({
      logger,
      authorization: getAlertingAuthorization(request),
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      esClient: this.esClient,
      ruleDataService: this.ruleDataService!,
      getRuleType: this.getRuleType,
      getRuleList: this.getRuleList,
      getAlertIndicesAlias: this.getAlertIndicesAlias,
    });
  }
}
