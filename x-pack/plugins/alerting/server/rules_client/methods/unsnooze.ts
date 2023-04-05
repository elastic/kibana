/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { SavedObjectReference } from '@kbn/core/server';

import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../../saved_objects';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { updateMeta, migrateLegacyActions } from '../lib';
import { getUnsnoozeAttributes } from '../common';

export interface UnsnoozeParams {
  id: string;
  scheduleIds?: string[];
}

export async function unsnooze(
  context: RulesClientContext,
  { id, scheduleIds }: UnsnoozeParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unsnooze('${id}')`,
    async () => await unsnoozeWithOCC(context, { id, scheduleIds })
  );
}

async function unsnoozeWithOCC(context: RulesClientContext, { id, scheduleIds }: UnsnoozeParams) {
  const { attributes, version, references } =
    await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Unsnooze,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNSNOOZE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNSNOOZE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  let resultedActions: RawRule['actions'] = [];
  let resultedReferences: SavedObjectReference[] = [];
  let hasLegacyActions = false;

  // migrate legacy actions only for SIEM rules
  if (attributes.consumer === AlertConsumers.SIEM) {
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: id,
      actions: attributes.actions,
      references,
      attributes,
    });

    resultedActions = migratedActions.actions;
    resultedReferences = migratedActions.references;
    hasLegacyActions = migratedActions.hasLegacyActions;
  }

  const newAttrs = getUnsnoozeAttributes(attributes, scheduleIds);

  const updateAttributes = updateMeta(context, {
    ...newAttrs,
    ...(hasLegacyActions ? { actions: resultedActions } : {}),
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  });
  const updateOptions = {
    version,
    ...(hasLegacyActions ? { references: resultedReferences } : {}),
  };

  await partiallyUpdateAlert(
    context.unsecuredSavedObjectsClient,
    id,
    updateAttributes,
    updateOptions
  );
}
