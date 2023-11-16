/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../../authorization';
import { AdHocRuleRunParams } from '../../../../../types';
import { RulesClientContext } from '../../../../../rules_client';
import type { DeleteBackfillOptions } from './types';
import { deleteBackfillOptionsSchema } from './schemas';
import { ruleAuditEvent, RuleAuditAction } from '../../../../../rules_client/common/audit_events';

export async function deleteBackfill(
  context: RulesClientContext,
  options: DeleteBackfillOptions
): Promise<void> {
  try {
    deleteBackfillOptionsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating delete options - ${error.message}`);
  }

  const result = await context.unsecuredSavedObjectsClient.get<AdHocRuleRunParams>(
    'backfill_params',
    options.id
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: result.attributes.rule.alertTypeId,
      consumer: result.attributes.rule.consumer,
      operation: WriteOperations.DeleteBackfill,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DELETE_BACKFILL,
        savedObject: { type: 'backfill_params', id: options.id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.DELETE_BACKFILL,
      savedObject: { type: 'backfill_params', id: options.id },
    })
  );

  await context.unsecuredSavedObjectsClient.delete('backfill_params', options.id);
}
