/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawRule, IntervalSchedule } from '../../types';
import { resetMonitoringLastRun, getNextRun } from '../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { updateMeta, createNewAPIKeySet, scheduleTask } from '../lib';

export async function enable(context: RulesClientContext, { id }: { id: string }): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.enable('${id}')`,
    async () => await enableWithOCC(context, { id })
  );
}

async function enableWithOCC(context: RulesClientContext, { id }: { id: string }) {
  let existingApiKey: string | null = null;
  let attributes: RawRule;
  let version: string | undefined;

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
        namespace: context.namespace,
      });
    existingApiKey = decryptedAlert.attributes.apiKey;
    attributes = decryptedAlert.attributes;
    version = decryptedAlert.version;
  } catch (e) {
    context.logger.error(`enable(): Failed to load API key of alert ${id}: ${e.message}`);
    // Still attempt to load the attributes and version using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
    attributes = alert.attributes;
    version = alert.version;
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Enable,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.ENABLE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.ENABLE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  if (attributes.enabled === false) {
    const username = await context.getUserName();
    const now = new Date();

    const schedule = attributes.schedule as IntervalSchedule;

    const updateAttributes = updateMeta(context, {
      ...attributes,
      ...(!existingApiKey && (await createNewAPIKeySet(context, { attributes, username }))),
      ...(attributes.monitoring && {
        monitoring: resetMonitoringLastRun(attributes.monitoring),
      }),
      nextRun: getNextRun({ interval: schedule.interval }),
      enabled: true,
      updatedBy: username,
      updatedAt: now.toISOString(),
      executionStatus: {
        status: 'pending',
        lastDuration: 0,
        lastExecutionDate: now.toISOString(),
        error: null,
        warning: null,
      },
    });

    try {
      await context.unsecuredSavedObjectsClient.update('alert', id, updateAttributes, { version });
    } catch (e) {
      throw e;
    }
  }

  let scheduledTaskIdToCreate: string | null = null;
  if (attributes.scheduledTaskId) {
    // If scheduledTaskId defined in rule SO, make sure it exists
    try {
      await context.taskManager.get(attributes.scheduledTaskId);
    } catch (err) {
      scheduledTaskIdToCreate = id;
    }
  } else {
    // If scheduledTaskId doesn't exist in rule SO, set it to rule ID
    scheduledTaskIdToCreate = id;
  }

  if (scheduledTaskIdToCreate) {
    // Schedule the task if it doesn't exist
    const scheduledTask = await scheduleTask(context, {
      id,
      consumer: attributes.consumer,
      ruleTypeId: attributes.alertTypeId,
      schedule: attributes.schedule as IntervalSchedule,
      throwOnConflict: false,
    });
    await context.unsecuredSavedObjectsClient.update('alert', id, {
      scheduledTaskId: scheduledTask.id,
    });
  } else {
    // Task exists so set enabled to true
    await context.taskManager.bulkEnable([attributes.scheduledTaskId!]);
  }
}
