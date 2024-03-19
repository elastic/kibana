/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';

import { RawRule, SanitizedRule, RuleTypeParams, SanitizedRuleWithLegacyId } from '../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getAlertFromRaw } from '../lib/get_alert_from_raw';
import { RulesClientContext } from '../types';
import { formatLegacyActions } from '../lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

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
  const result = await context.unsecuredSavedObjectsClient.get<RawRule>(RULE_SAVED_OBJECT_TYPE, id);
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
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );
  const rule = getAlertFromRaw<Params>(
    context,
    result.id,
    result.attributes.alertTypeId,
    result.attributes,
    result.references,
    includeLegacyId,
    excludeFromPublicApi,
    includeSnoozeData
  );

  // format legacy actions for SIEM rules
  if (result.attributes.consumer === AlertConsumers.SIEM) {
    const [migratedRule] = await formatLegacyActions([rule], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    return migratedRule;
  }

  return rule;
}
