/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { withSpan } from '@kbn/apm-utils';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRuleSavedObject } from '../../../../rules_client/lib';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { validateSnoozeStartDate } from '../../../../lib/validate_snooze_date';
import { RuleMutedError } from '../../../../lib/errors/rule_muted';
import { RulesClientContext } from '../../../../rules_client/types';
import {
  getSnoozeAttributes,
  verifySnoozeAttributeScheduleLimit,
} from '../../../../rules_client/common';
import { updateRuleSo } from '../../../../data/rule';
import { updateMetaAttributes } from '../../../../rules_client/lib/update_meta_attributes';
import { snoozeRuleParamsSchema } from './schemas';
import type { SnoozeRuleOptions } from './types';

export async function snoozeRule(
  context: RulesClientContext,
  { id, snoozeSchedule }: SnoozeRuleOptions
): Promise<void> {
  try {
    snoozeRuleParamsSchema.validate({ id });
  } catch (error) {
    throw Boom.badRequest(`Error validating snooze params - ${error.message}`);
  }
  const snoozeDateValidationMsg = validateSnoozeStartDate(snoozeSchedule.rRule.dtstart);
  if (snoozeDateValidationMsg) {
    throw new RuleMutedError(snoozeDateValidationMsg);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.snooze('${id}', ${JSON.stringify(snoozeSchedule, null, 4)})`,
    async () => await snoozeWithOCC(context, { id, snoozeSchedule })
  );
}

async function snoozeWithOCC(
  context: RulesClientContext,
  { id, snoozeSchedule }: SnoozeRuleOptions
) {
  const { attributes, version } = await withSpan(
    { name: 'getRuleSavedObject', type: 'rules' },
    () =>
      getRuleSavedObject(context, {
        ruleId: id,
      })
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Snooze,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SNOOZE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.SNOOZE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const newAttrs = getSnoozeAttributes(attributes, snoozeSchedule);

  try {
    verifySnoozeAttributeScheduleLimit(newAttrs);
  } catch (error) {
    throw Boom.badRequest(error.message);
  }

  await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id,
    updateRuleAttributes: updateMetaAttributes(context, {
      ...newAttrs,
      updatedBy: await context.getUserName(),
      updatedAt: new Date().toISOString(),
    }),
  });
}
