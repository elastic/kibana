/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import type {
  Logger,
  KibanaRequest,
  ISavedObjectsRepository,
  IBasePath,
  ExecutionContextStart,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  UiSettingsServiceStart,
} from '../../../../../src/core/server';
import { RunContext } from '../../../task_manager/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions/server';
import {
  RuleTypeParams,
  RuleTypeRegistry,
  SpaceIdToNamespaceFunction,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import { TaskRunner } from './task_runner';
import { IEventLogger } from '../../../event_log/server';
import { RulesClient } from '../rules_client';
import { NormalizedRuleType } from '../rule_type_registry';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';
import { NodeLevelMetrics } from '../monitoring';

export interface TaskRunnerContext {
  logger: Logger;
  data: DataPluginStart;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  getRulesClientWithRequest(request: KibanaRequest): PublicMethodsOf<RulesClient>;
  actionsPlugin: ActionsPluginStartContract;
  eventLogger: IEventLogger;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  executionContext: ExecutionContextStart;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  basePathService: IBasePath;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  ruleTypeRegistry: RuleTypeRegistry;
  kibanaBaseUrl: string | undefined;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerRule: number;
  cancelAlertsOnRuleTimeout: boolean;
  usageCounter?: UsageCounter;
  nodeLevelMetrics?: NodeLevelMetrics;
}

export class TaskRunnerFactory {
  private isInitialized = false;
  private taskRunnerContext?: TaskRunnerContext;

  public initialize(taskRunnerContext: TaskRunnerContext) {
    if (this.isInitialized) {
      throw new Error('TaskRunnerFactory already initialized');
    }
    this.isInitialized = true;
    this.taskRunnerContext = taskRunnerContext;
  }

  public create<
    Params extends RuleTypeParams,
    ExtractedParams extends RuleTypeParams,
    State extends RuleTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    ruleType: NormalizedRuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >,
    { taskInstance }: RunContext
  ) {
    if (!this.isInitialized) {
      throw new Error('TaskRunnerFactory not initialized');
    }

    return new TaskRunner<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >(ruleType, taskInstance, this.taskRunnerContext!);
  }
}
