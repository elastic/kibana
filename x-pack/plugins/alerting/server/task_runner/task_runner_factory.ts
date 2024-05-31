/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunContext } from '@kbn/task-manager-plugin/server';
import {
  RuleAlertData,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import { TaskRunner } from './task_runner';
import { NormalizedRuleType } from '../rule_type_registry';
import { InMemoryMetrics } from '../monitoring';
import { TaskRunnerContext } from './types';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { AdHocTaskRunner } from './ad_hoc_task_runner';

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
    RecoveryActionGroupId extends string,
    AlertData extends RuleAlertData
  >(
    ruleType: NormalizedRuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >,
    { taskInstance }: RunContext,
    inMemoryMetrics: InMemoryMetrics
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
      RecoveryActionGroupId,
      AlertData
    >({
      context: this.taskRunnerContext!,
      inMemoryMetrics,
      internalSavedObjectsRepository: this.taskRunnerContext!.savedObjects.createInternalRepository(
        [RULE_SAVED_OBJECT_TYPE]
      ),
      ruleType,
      taskInstance,
    });
  }

  public createAdHoc({ taskInstance }: RunContext) {
    if (!this.isInitialized) {
      throw new Error('TaskRunnerFactory not initialized');
    }

    return new AdHocTaskRunner({
      taskInstance,
      context: this.taskRunnerContext!,
      internalSavedObjectsRepository: this.taskRunnerContext!.savedObjects.createInternalRepository(
        [RULE_SAVED_OBJECT_TYPE, AD_HOC_RUN_SAVED_OBJECT_TYPE]
      ),
    });
  }
}
