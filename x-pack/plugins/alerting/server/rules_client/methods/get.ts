/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawRule, SanitizedRule, RuleTypeParams, SanitizedRuleWithLegacyId } from '../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getAlertFromRaw } from '../lib/get_alert_from_raw';
import { RulesClientContext } from '../types';

export interface GetParams {
  id: string;
  includeLegacyId?: boolean;
  includeSnoozeData?: boolean;
  excludeFromPublicApi?: boolean;
}

export async function get<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  {
    id,
    includeLegacyId = false,
    includeSnoozeData = false,
    excludeFromPublicApi = false,
  }: GetParams
): Promise<SanitizedRule<Params> | SanitizedRuleWithLegacyId<Params>> {
  const result = await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: result.attributes.alertTypeId,
      consumer: result.attributes.consumer,
      operation: ReadOperations.Get,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET,
      savedObject: { type: 'alert', id },
    })
  );
  return getAlertFromRaw<Params>(
    context,
    result.id,
    result.attributes.alertTypeId,
    result.attributes,
    result.references,
    includeLegacyId,
    excludeFromPublicApi,
    includeSnoozeData
  );
}
