/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';

import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RawRule, RuleTypeParams, ResolvedSanitizedRule } from '../../../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { getAlertFromRaw } from '../../../../rules_client/lib/get_alert_from_raw';
import { RulesClientContext } from '../../../../rules_client/types';
import { formatLegacyActions } from '../../../../rules_client/lib';

export interface ResolveParams {
  id: string;
  includeLegacyId?: boolean;
  includeSnoozeData?: boolean;
}

export async function resolveRule<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  { id, includeLegacyId, includeSnoozeData = false }: ResolveParams
): Promise<ResolvedSanitizedRule<Params>> {
  const { saved_object: result, ...resolveResponse } =
    await context.unsecuredSavedObjectsClient.resolve<RawRule>('alert', id);
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
        action: RuleAuditAction.RESOLVE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.RESOLVE,
      savedObject: { type: 'alert', id },
    })
  );

  const rule = getAlertFromRaw<Params>(
    context,
    result.id,
    result.attributes.alertTypeId,
    result.attributes,
    result.references,
    includeLegacyId,
    false,
    includeSnoozeData
  );

  // format legacy actions for SIEM rules
  if (result.attributes.consumer === AlertConsumers.SIEM) {
    const [migratedRule] = await formatLegacyActions([rule], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    return {
      ...migratedRule,
      ...resolveResponse,
    };
  }

  return {
    ...rule,
    ...resolveResponse,
  };
}
