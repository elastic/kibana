/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ExecutionContextStart } from '../../../../../src/core/server/execution_context/execution_context_service';
import type { IBasePath } from '../../../../../src/core/server/http/base_path_service';
import { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type { ISavedObjectsRepository } from '../../../../../src/core/server/saved_objects/service/lib/repository';
import type { PluginStartContract as ActionsPluginStartContract } from '../../../actions/server/plugin';
import type { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server/saved_objects';
import type { IEventLogger } from '../../../event_log/server/types';
import type { RunContext } from '../../../task_manager/server/task';
import type { AlertTypeParams, AlertTypeState } from '../../common/alert';
import type { AlertInstanceContext, AlertInstanceState } from '../../common/alert_instance';
import { RulesClient } from '../rules_client/rules_client';
import type { NormalizedAlertType } from '../rule_type_registry';
import type { GetServicesFunction, RuleTypeRegistry, SpaceIdToNamespaceFunction } from '../types';
import { TaskRunner } from './task_runner';

export interface TaskRunnerContext {
  logger: Logger;
  getServices: GetServicesFunction;
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
  maxEphemeralActionsPerAlert: Promise<number>;
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
    Params extends AlertTypeParams,
    ExtractedParams extends AlertTypeParams,
    State extends AlertTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    alertType: NormalizedAlertType<
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
    >(alertType, taskInstance, this.taskRunnerContext!);
  }
}
