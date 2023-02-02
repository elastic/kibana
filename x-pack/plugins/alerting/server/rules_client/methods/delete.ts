/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';

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
  let attributes: RawRule;

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
        namespace: context.namespace,
      });
    apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
    taskIdToRemove = decryptedAlert.attributes.scheduledTaskId;
    attributes = decryptedAlert.attributes;
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `delete(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the scheduledTaskId using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
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
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.DELETE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );
  const removeResult = await context.unsecuredSavedObjectsClient.delete('alert', id);

  await Promise.all([
    taskIdToRemove ? context.taskManager.removeIfExists(taskIdToRemove) : null,
    apiKeyToInvalidate
      ? bulkMarkApiKeysForInvalidation(
          { apiKeys: [apiKeyToInvalidate] },
          context.logger,
          context.unsecuredSavedObjectsClient
        )
      : null,
  ]);

  return removeResult;
}
