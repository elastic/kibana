/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { RuleTaskState } from '../../types';
import { taskInstanceToAlertTaskInstance } from '../../task_runner/alert_task_instance';
import { ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { RulesClientContext } from '../types';
import { get } from './get';

export interface GetAlertStateParams {
  id: string;
}
export async function getAlertState(
  context: RulesClientContext,
  { id }: GetAlertStateParams
): Promise<RuleTaskState | void> {
  const rule = await get(context, { id });
  await context.authorization.ensureAuthorized({
    ruleTypeId: rule.alertTypeId,
    consumer: rule.consumer,
    operation: ReadOperations.GetRuleState,
    entity: AlertingAuthorizationEntity.Rule,
  });
  if (rule.scheduledTaskId) {
    try {
      const { state } = taskInstanceToAlertTaskInstance(
        await context.taskManager.get(rule.scheduledTaskId),
        rule
      );
      return state;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        context.logger.warn(`Task (${rule.scheduledTaskId}) not found`);
      } else {
        context.logger.warn(
          `An error occurred when getting the task state for (${rule.scheduledTaskId}): ${e.message}`
        );
      }
    }
  }
}
