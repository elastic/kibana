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
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { MuteOptions } from '../types';
import { RulesClientContext } from '../types';
import { updateMeta, migrateLegacyActions } from '../lib';

export async function unmuteInstance(
  context: RulesClientContext,
  { alertId, alertInstanceId }: MuteOptions
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unmuteInstance('${alertId}')`,
    async () => await unmuteInstanceWithOCC(context, { alertId, alertInstanceId })
  );
}

async function unmuteInstanceWithOCC(
  context: RulesClientContext,
  {
    alertId,
    alertInstanceId,
  }: {
    alertId: string;
    alertInstanceId: string;
  }
) {
  const { attributes, version, references } =
    await context.unsecuredSavedObjectsClient.get<RawRule>('alert', alertId);

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UnmuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });
    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE_ALERT,
        savedObject: { type: 'alert', id: alertId },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNMUTE_ALERT,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: alertId },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const mutedInstanceIds = attributes.mutedInstanceIds || [];
  if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
    let resultedActions: RawRule['actions'] = [];
    let resultedReferences: SavedObjectReference[] = [];
    let hasLegacyActions = false;

    // migrate legacy actions only for SIEM rules
    if (attributes.consumer === AlertConsumers.SIEM) {
      const migratedActions = await migrateLegacyActions(context, {
        ruleId: alertId,
        actions: attributes.actions,
        references,
      });

      resultedActions = migratedActions.actions;
      resultedReferences = migratedActions.references;
      hasLegacyActions = migratedActions.hasLegacyActions;
    }

    await context.unsecuredSavedObjectsClient.update<RawRule>(
      'alert',
      alertId,
      updateMeta(context, {
        updatedBy: await context.getUserName(),
        updatedAt: new Date().toISOString(),
        mutedInstanceIds: mutedInstanceIds.filter((id: string) => id !== alertInstanceId),
        ...(hasLegacyActions ? { actions: resultedActions } : {}),
      }),
      {
        version,
        ...(hasLegacyActions ? { references: resultedReferences } : {}),
      }
    );
  }
}
