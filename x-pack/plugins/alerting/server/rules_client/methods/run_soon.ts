/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import { Rule } from '../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';

export async function runSoon(context: RulesClientContext, { id }: { id: string }) {
  const { attributes } = await context.unsecuredSavedObjectsClient.get<Rule>('alert', id);
  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: ReadOperations.RunSoon,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.RUN_SOON,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.RUN_SOON,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  // Check that the rule is enabled
  if (!attributes.enabled) {
    return i18n.translate('xpack.alerting.rulesClient.runSoon.disabledRuleError', {
      defaultMessage: 'Error running rule: rule is disabled',
    });
  }

  let taskDoc: ConcreteTaskInstance | null = null;
  try {
    taskDoc = attributes.scheduledTaskId
      ? await context.taskManager.get(attributes.scheduledTaskId)
      : null;
  } catch (err) {
    return i18n.translate('xpack.alerting.rulesClient.runSoon.getTaskError', {
      defaultMessage: 'Error running rule: {errMessage}',
      values: {
        errMessage: err.message,
      },
    });
  }

  if (
    taskDoc &&
    (taskDoc.status === TaskStatus.Claiming || taskDoc.status === TaskStatus.Running)
  ) {
    return i18n.translate('xpack.alerting.rulesClient.runSoon.ruleIsRunning', {
      defaultMessage: 'Rule is already running',
    });
  }

  try {
    await context.taskManager.runSoon(attributes.scheduledTaskId ? attributes.scheduledTaskId : id);
  } catch (err) {
    return i18n.translate('xpack.alerting.rulesClient.runSoon.runSoonError', {
      defaultMessage: 'Error running rule: {errMessage}',
      values: {
        errMessage: err.message,
      },
    });
  }
}
