/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  Logger,
  KibanaRequest,
  ISavedObjectsRepository,
  IBasePath,
  ExecutionContextStart,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import { RunContext } from '@kbn/task-manager-plugin/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { IEventLogger } from '@kbn/event-log-plugin/server';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { SharePluginStart } from '@kbn/share-plugin/server';
import {
  RuleTypeRegistry,
  SpaceIdToNamespaceFunction,
  RulesClientApi,
  RulesSettingsClientApi,
  MaintenanceWindowClientApi,
} from '../types';
import { ActionsConfigMap } from '../lib/get_actions_config_map';
import { AlertsService } from '../alerts_service/alerts_service';
import { AdHocTaskRunner } from './ad_hoc_task_runner';

export interface AdHocTaskRunnerContext {
  logger: Logger;
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  share: SharePluginStart;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  getRulesClientWithRequest(request: KibanaRequest): RulesClientApi;
  actionsPlugin: ActionsPluginStartContract;
  eventLogger: IEventLogger;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  executionContext: ExecutionContextStart;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  basePathService: IBasePath;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  ruleTypeRegistry: RuleTypeRegistry;
  alertsService: AlertsService | null;
  kibanaBaseUrl: string | undefined;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerRule: number;
  maxAlerts: number;
  actionsConfigMap: ActionsConfigMap;
  cancelAlertsOnRuleTimeout: boolean;
  usageCounter?: UsageCounter;
  getRulesSettingsClientWithRequest(request: KibanaRequest): RulesSettingsClientApi;
  getMaintenanceWindowClientWithRequest(request: KibanaRequest): MaintenanceWindowClientApi;
}

export class AdHocTaskRunnerFactory {
  private isInitialized = false;
  private context?: AdHocTaskRunnerContext;

  public initialize(context: AdHocTaskRunnerContext) {
    if (this.isInitialized) {
      throw new Error('AdHocTaskRunnerFactory already initialized');
    }
    this.isInitialized = true;
    this.context = context;
  }

  public create({ taskInstance }: RunContext) {
    if (!this.isInitialized) {
      throw new Error('AdHocTaskRunnerFactory not initialized');
    }

    return new AdHocTaskRunner(this.context!, taskInstance);
  }
}
