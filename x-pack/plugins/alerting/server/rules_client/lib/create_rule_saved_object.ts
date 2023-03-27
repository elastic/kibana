/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference, SavedObject } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { RawRule, RuleTypeParams } from '../../types';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { SavedObjectOptions } from '../types';
import { RulesClientContext } from '../types';
import { updateMeta } from './update_meta';
import { scheduleTask } from './schedule_task';
import { getAlertFromRaw } from './get_alert_from_raw';

export async function createRuleSavedObject<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  {
    intervalInMs,
    rawRule,
    references,
    ruleId,
    options,
  }: {
    intervalInMs: number;
    rawRule: RawRule;
    references: SavedObjectReference[];
    ruleId: string;
    options?: SavedObjectOptions;
  }
) {
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.CREATE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: ruleId },
    })
  );

  let createdAlert: SavedObject<RawRule>;
  try {
    createdAlert = await withSpan(
      { name: 'unsecuredSavedObjectsClient.create', type: 'rules' },
      () =>
        context.unsecuredSavedObjectsClient.create('alert', updateMeta(context, rawRule), {
          ...options,
          references,
          id: ruleId,
        })
    );
  } catch (e) {
    // Avoid unused API key
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: rawRule.apiKey ? [rawRule.apiKey] : [] },
      context.logger,
      context.unsecuredSavedObjectsClient
    );

    throw e;
  }
  if (rawRule.enabled) {
    let scheduledTaskId: string;
    try {
      const scheduledTask = await scheduleTask(context, {
        id: createdAlert.id,
        consumer: rawRule.consumer,
        ruleTypeId: rawRule.alertTypeId,
        schedule: rawRule.schedule,
        throwOnConflict: true,
      });
      scheduledTaskId = scheduledTask.id;
    } catch (e) {
      // Cleanup data, something went wrong scheduling the task
      try {
        await context.unsecuredSavedObjectsClient.delete('alert', createdAlert.id);
      } catch (err) {
        // Skip the cleanup error and throw the task manager error to avoid confusion
        context.logger.error(
          `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${err.message}`
        );
      }
      throw e;
    }

    await withSpan({ name: 'unsecuredSavedObjectsClient.update', type: 'rules' }, () =>
      context.unsecuredSavedObjectsClient.update<RawRule>('alert', createdAlert.id, {
        scheduledTaskId,
      })
    );
    createdAlert.attributes.scheduledTaskId = scheduledTaskId;
  }

  // Log warning if schedule interval is less than the minimum but we're not enforcing it
  if (
    intervalInMs < context.minimumScheduleIntervalInMs &&
    !context.minimumScheduleInterval.enforce
  ) {
    context.logger.warn(
      `Rule schedule interval (${rawRule.schedule.interval}) for "${createdAlert.attributes.alertTypeId}" rule type with ID "${createdAlert.id}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent creation of these rules.`
    );
  }

  return getAlertFromRaw<Params>(
    context,
    createdAlert.id,
    createdAlert.attributes.alertTypeId,
    createdAlert.attributes,
    references,
    false,
    true
  );
}
