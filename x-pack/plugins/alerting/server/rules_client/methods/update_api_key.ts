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
import { createNewAPIKeySet, updateMeta } from '../lib';
import { RulesClientContext } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export async function updateApiKey(
  context: RulesClientContext,
  { id }: { id: string }
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.updateApiKey('${id}')`,
    async () => await updateApiKeyWithOCC(context, { id })
  );
}

async function updateApiKeyWithOCC(context: RulesClientContext, { id }: { id: string }) {
  let oldApiKeyToInvalidate: string | null = null;
  let oldApiKeyCreatedByUser: boolean | undefined | null = false;
  let attributes: RawRule;
  let version: string | undefined;

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        {
          namespace: context.namespace,
        }
      );
    oldApiKeyToInvalidate = decryptedAlert.attributes.apiKey;
    oldApiKeyCreatedByUser = decryptedAlert.attributes.apiKeyCreatedByUser;
    attributes = decryptedAlert.attributes;
    version = decryptedAlert.version;
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `updateApiKey(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the attributes and version using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      id
    );
    attributes = alert.attributes;
    version = alert.version;
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UpdateApiKey,
      entity: AlertingAuthorizationEntity.Rule,
    });
    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UPDATE_API_KEY,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }

  const username = await context.getUserName();

  const apiKeyAttributes = await createNewAPIKeySet(context, {
    id: attributes.alertTypeId,
    ruleName: attributes.name,
    username,
    shouldUpdateApiKey: true,
    errorMessage: 'Error updating API key for rule: could not create API key',
  });

  const updateAttributes = updateMeta(context, {
    ...attributes,
    ...apiKeyAttributes,
    updatedAt: new Date().toISOString(),
    updatedBy: username,
  });

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UPDATE_API_KEY,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  try {
    await context.unsecuredSavedObjectsClient.update(RULE_SAVED_OBJECT_TYPE, id, updateAttributes, {
      version,
    });
  } catch (e) {
    // Avoid unused API key
    await bulkMarkApiKeysForInvalidation(
      {
        apiKeys:
          updateAttributes.apiKey && !updateAttributes.apiKeyCreatedByUser
            ? [updateAttributes.apiKey]
            : [],
      },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
    throw e;
  }

  if (oldApiKeyToInvalidate && !oldApiKeyCreatedByUser) {
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: [oldApiKeyToInvalidate] },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
  }
}
