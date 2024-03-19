/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectReference } from '@kbn/core/server';

import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { untrackRuleAlerts, updateMeta, migrateLegacyActions } from '../lib';
import { RuleAttributes } from '../../data/rule/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export async function disable(
  context: RulesClientContext,
  {
    id,
    untrack = false,
  }: {
    id: string;
    untrack?: boolean;
  }
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.disable('${id}')`,
    async () => await disableWithOCC(context, { id, untrack })
  );
}

async function disableWithOCC(
  context: RulesClientContext,
  {
    id,
    untrack = false,
  }: {
    id: string;
    untrack?: boolean;
  }
) {
  let attributes: RawRule;
  let version: string | undefined;
  let references: SavedObjectReference[];

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        {
          namespace: context.namespace,
        }
      );
    attributes = decryptedAlert.attributes;
    version = decryptedAlert.version;
    references = decryptedAlert.references;
  } catch (e) {
    context.logger.error(`disable(): Failed to load API key of alert ${id}: ${e.message}`);
    // Still attempt to load the attributes and version using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      id
    );
    attributes = alert.attributes;
    version = alert.version;
    references = alert.references;
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Disable,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DISABLE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }

  if (untrack) {
    await untrackRuleAlerts(context, id, attributes as RuleAttributes);
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.DISABLE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  if (attributes.enabled === true) {
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: id,
      actions: attributes.actions,
      references,
      attributes,
    });

    await context.unsecuredSavedObjectsClient.update(
      RULE_SAVED_OBJECT_TYPE,
      id,
      updateMeta(context, {
        ...attributes,
        enabled: false,
        scheduledTaskId: attributes.scheduledTaskId === id ? attributes.scheduledTaskId : null,
        updatedBy: await context.getUserName(),
        updatedAt: new Date().toISOString(),
        nextRun: null,
        ...(migratedActions.hasLegacyActions
          ? { actions: migratedActions.resultedActions, throttle: undefined, notifyWhen: undefined }
          : {}),
      }),
      {
        version,
        ...(migratedActions.hasLegacyActions
          ? { references: migratedActions.resultedReferences }
          : {}),
      }
    );
    const { autoRecoverAlerts: isLifecycleAlert } = context.ruleTypeRegistry.get(
      attributes.alertTypeId
    );

    // If the scheduledTaskId does not match the rule id, we should
    // remove the task, otherwise mark the task as disabled
    if (attributes.scheduledTaskId) {
      if (attributes.scheduledTaskId !== id) {
        await context.taskManager.removeIfExists(attributes.scheduledTaskId);
      } else {
        await context.taskManager.bulkDisable(
          [attributes.scheduledTaskId],
          Boolean(isLifecycleAlert)
        );
      }
    }
  }
}
