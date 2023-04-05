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
import { clearUnscheduledSnooze } from '../common';

export async function unmuteAll(
  context: RulesClientContext,
  { id }: { id: string }
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unmuteAll('${id}')`,
    async () => await unmuteAllWithOCC(context, { id })
  );
}

async function unmuteAllWithOCC(context: RulesClientContext, { id }: { id: string }) {
  const { attributes, version, references } =
    await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UnmuteAll,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNMUTE,
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

  const updateAttributes = updateMeta(context, {
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: clearUnscheduledSnooze(attributes),
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
    ...(hasLegacyActions ? { actions: resultedActions } : {}),
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
