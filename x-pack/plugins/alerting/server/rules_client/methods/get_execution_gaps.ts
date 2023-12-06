/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRuleWithLegacyId } from '../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { get } from './get';

export async function getRuleExecutionGaps(context: RulesClientContext, id: string) {
  context.logger.debug(`getRuleExecutionGaps(): getting execution gaps for rule ${id}`);
  const rule = (await get(context, { id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

  try {
    // Make sure user has access to this rule
    await context.authorization.ensureAuthorized({
      ruleTypeId: rule.alertTypeId,
      consumer: rule.consumer,
      operation: ReadOperations.GetRuleExecutionKPI,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_RULE_EXECUTION_KPI,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_RULE_EXECUTION_KPI,
      savedObject: { type: 'alert', id },
    })
  );

  try {
    return await context.backfillClient.getGapsFor(id);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getRuleExecutionGaps(): error searching execution gaps for rule ${id}: ${err.message}`
    );
    throw err;
  }
}
