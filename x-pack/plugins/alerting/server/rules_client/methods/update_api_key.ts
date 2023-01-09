/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { generateAPIKeyName, apiKeyAsAlertAttributes } from '../common';
import { updateMeta } from '../lib';
import { RulesClientContext } from '../types';

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
  let apiKeyToInvalidate: string | null = null;
  let attributes: RawRule;
  let version: string | undefined;

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
        namespace: context.namespace,
      });
    apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
    attributes = decryptedAlert.attributes;
    version = decryptedAlert.version;
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `updateApiKey(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the attributes and version using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
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
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UPDATE_API_KEY,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  const username = await context.getUserName();

  let createdAPIKey = null;
  try {
    createdAPIKey = await context.createAPIKey(
      generateAPIKeyName(attributes.alertTypeId, attributes.name)
    );
  } catch (error) {
    throw Boom.badRequest(
      `Error updating API key for rule: could not create API key - ${error.message}`
    );
  }

  const updateAttributes = updateMeta(context, {
    ...attributes,
    ...apiKeyAsAlertAttributes(createdAPIKey, username),
    updatedAt: new Date().toISOString(),
    updatedBy: username,
  });

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UPDATE_API_KEY,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  try {
    await context.unsecuredSavedObjectsClient.update('alert', id, updateAttributes, { version });
  } catch (e) {
    // Avoid unused API key
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: updateAttributes.apiKey ? [updateAttributes.apiKey] : [] },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
    throw e;
  }

  if (apiKeyToInvalidate) {
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: [apiKeyToInvalidate] },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
  }
}
