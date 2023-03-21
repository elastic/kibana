/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  const alert = await get(context, { id });
  await context.authorization.ensureAuthorized({
    ruleTypeId: alert.alertTypeId,
    consumer: alert.consumer,
    operation: ReadOperations.GetRuleState,
    entity: AlertingAuthorizationEntity.Rule,
  });
  if (alert.scheduledTaskId) {
    const { state } = taskInstanceToAlertTaskInstance(
      await context.taskManager.get(alert.scheduledTaskId),
      alert
    );
    return state;
  }
}
