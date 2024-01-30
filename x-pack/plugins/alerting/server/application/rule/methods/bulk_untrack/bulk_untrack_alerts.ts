/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import Boom from '@hapi/boom';
import { withSpan } from '@kbn/apm-utils';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { bulkUntrackBodySchema } from './schemas';
import type { BulkUntrackBody } from './types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';

export type { BulkUntrackBody };

export async function bulkUntrackAlerts(
  context: RulesClientContext,
  params: BulkUntrackBody
): Promise<void> {
  try {
    bulkUntrackBodySchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.bulkUntrack('${params.alertUuids}')`,
    async () => await bulkUntrackAlertsWithOCC(context, params)
  );
}

async function bulkUntrackAlertsWithOCC(
  context: RulesClientContext,
  { indices, alertUuids }: BulkUntrackBody
) {
  try {
    if (!context.alertsService) throw new Error('unable to access alertsService');
    const result = await context.alertsService.setAlertsToUntracked({
      indices,
      alertUuids,
      ensureAuthorized: async ({
        ruleTypeId,
        consumer,
      }: {
        ruleTypeId: string;
        consumer: string;
      }) =>
        await withSpan({ name: 'authorization.ensureAuthorized', type: 'alerts' }, () =>
          context.authorization.ensureAuthorized({
            ruleTypeId,
            consumer,
            operation: WriteOperations.Update,
            entity: AlertingAuthorizationEntity.Alert,
          })
        ),
    });

    // Clear alert instances from their corresponding tasks so that they can remain untracked
    const taskIds = [...new Set(result.map((doc) => doc[ALERT_RULE_UUID]))];
    await context.taskManager.bulkUpdateState(taskIds, (state, id) => {
      try {
        const uuidsToClear = result
          .filter((doc) => doc[ALERT_RULE_UUID] === id)
          .map((doc) => doc[ALERT_UUID]);
        const alertTypeState = {
          ...state.alertTypeState,
          trackedAlerts: omitBy(state.alertTypeState.trackedAlerts, ({ alertUuid }) =>
            uuidsToClear.includes(alertUuid)
          ),
        };
        const alertInstances = omitBy(state.alertInstances, ({ meta: { uuid } }) =>
          uuidsToClear.includes(uuid)
        );
        return {
          ...state,
          alertTypeState,
          alertInstances,
        };
      } catch (e) {
        context.logger.error(`Failed to untrack alerts in task ID ${id}`);
        return state;
      }
    });

    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNTRACK_ALERT,
        outcome: 'success',
      })
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNTRACK_ALERT,
        error,
      })
    );
    throw error;
  }
}
