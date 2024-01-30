/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { untrackRuleAlerts, migrateLegacyActions } from '../lib';
import { RuleAttributes } from '../../data/rule/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export async function deleteRule(context: RulesClientContext, { id }: { id: string }) {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.delete('${id}')`,
    async () => await deleteWithOCC(context, { id })
  );
}

async function deleteWithOCC(context: RulesClientContext, { id }: { id: string }) {
  let taskIdToRemove: string | undefined | null;
  let apiKeyToInvalidate: string | null = null;
  let apiKeyCreatedByUser: boolean | undefined | null = false;
  let attributes: RawRule;

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        {
          namespace: context.namespace,
        }
      );
    apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
    apiKeyCreatedByUser = decryptedAlert.attributes.apiKeyCreatedByUser;
    taskIdToRemove = decryptedAlert.attributes.scheduledTaskId;
    attributes = decryptedAlert.attributes;
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `delete(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the scheduledTaskId using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      id
    );
    taskIdToRemove = alert.attributes.scheduledTaskId;
    attributes = alert.attributes;
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Delete,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DELETE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }

  await untrackRuleAlerts(context, id, attributes as RuleAttributes);

  // migrate legacy actions only for SIEM rules
  if (attributes.consumer === AlertConsumers.SIEM) {
    await migrateLegacyActions(context, { ruleId: id, attributes, skipActionsValidation: true });
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.DELETE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );
  const removeResult = await context.unsecuredSavedObjectsClient.delete(RULE_SAVED_OBJECT_TYPE, id);

  await Promise.all([
    taskIdToRemove ? context.taskManager.removeIfExists(taskIdToRemove) : null,
    apiKeyToInvalidate && !apiKeyCreatedByUser
      ? bulkMarkApiKeysForInvalidation(
          { apiKeys: [apiKeyToInvalidate] },
          context.logger,
          context.unsecuredSavedObjectsClient
        )
      : null,
  ]);

  return removeResult;
}
