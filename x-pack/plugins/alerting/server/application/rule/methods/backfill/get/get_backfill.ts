/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RuleAuditAction, ruleAuditEvent } from '../../../../../rules_client/common/audit_events';
import { AlertingAuthorizationEntity, ReadOperations } from '../../../../../authorization';
import { AdHocRuleRunParams, SanitizedAdHocRuleRunParams } from '../../../../../types';
import { RulesClientContext } from '../../../../../rules_client';
import type { GetBackfillOptions } from './types';
import { getBackfillOptionsSchema } from './schemas';

export async function getBackfill(
  context: RulesClientContext,
  options: GetBackfillOptions
): Promise<SanitizedAdHocRuleRunParams> {
  try {
    getBackfillOptionsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating get options - ${error.message}`);
  }

  const result = await context.unsecuredSavedObjectsClient.get<AdHocRuleRunParams>(
    'backfill_params',
    options.id
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: result.attributes.rule.alertTypeId,
      consumer: result.attributes.rule.consumer,
      operation: ReadOperations.GetBackfill,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_BACKFILL,
        savedObject: { type: 'backfill_params', id: options.id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_BACKFILL,
      savedObject: { type: 'backfill_params', id: options.id },
    })
  );

  const { apiKeyToUse, ...restParams } = result.attributes;
  return restParams;
}
