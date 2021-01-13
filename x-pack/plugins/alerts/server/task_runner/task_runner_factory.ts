/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  Logger,
  KibanaRequest,
  ISavedObjectsRepository,
  IBasePath,
} from '../../../../../src/core/server';
import { RunContext } from '../../../task_manager/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions/server';
import {
  AlertTypeParams,
  AlertTypeRegistry,
  GetServicesFunction,
  SpaceIdToNamespaceFunction,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import { TaskRunner } from './task_runner';
import { IEventLogger } from '../../../event_log/server';
import { AlertsClient } from '../alerts_client';
import { NormalizedAlertType } from '../alert_type_registry';

export interface TaskRunnerContext {
  logger: Logger;
  getServices: GetServicesFunction;
  getAlertsClientWithRequest(request: KibanaRequest): PublicMethodsOf<AlertsClient>;
  actionsPlugin: ActionsPluginStartContract;
  eventLogger: IEventLogger;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  basePathService: IBasePath;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  alertTypeRegistry: AlertTypeRegistry;
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
    State extends AlertTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    alertType: NormalizedAlertType<
      Params,
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
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >(alertType, taskInstance, this.taskRunnerContext!);
  }
}
