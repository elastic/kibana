/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { updateRuleSo } from '../../../../data/rule/methods/update_rule_so';
import { muteAlertParamsSchema } from './schemas';
import type { MuteAlertParams } from './types';
import { Rule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';

export async function muteInstance(
  context: RulesClientContext,
  params: MuteAlertParams
): Promise<void> {
  try {
    muteAlertParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteInstance('${params.alertId}')`,
    async () => await muteInstanceWithOCC(context, params)
  );
}

async function muteInstanceWithOCC(
  context: RulesClientContext,
  { alertId, alertInstanceId }: MuteAlertParams
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    'alert',
    alertId
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE_ALERT,
        savedObject: { type: 'alert', id: alertId },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.MUTE_ALERT,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: alertId },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const mutedInstanceIds = attributes.mutedInstanceIds || [];
  if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
    mutedInstanceIds.push(alertInstanceId);
    await updateRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      savedObjectsUpdateOptions: { version },
      id: alertId,
      updateRuleAttributes: updateMeta(context, {
        mutedInstanceIds,
        updatedBy: await context.getUserName(),
        updatedAt: new Date().toISOString(),
      }),
    });
  }
}
