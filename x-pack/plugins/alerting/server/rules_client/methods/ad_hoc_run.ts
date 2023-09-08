/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
// import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import { RawRule, RuleAction, IntervalSchedule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { scheduleAdHocTask } from '../lib/schedule_ad_hoc_task';
import { updateMeta, createNewAPIKeySet, migrateLegacyActions } from '../lib';
import { resetMonitoringLastRun, getNextRun } from '../../lib';

export async function adHocRun(
  context: RulesClientContext,
  {
    id,
    from,
    to,
    actions,
    maxSignals,
  }: { id: string; from: string; to: string; maxSignals: number; actions?: RuleAction[] }
) {
  const decryptedAlert =
    await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
      namespace: context.namespace,
    });
  const existingApiKey = decryptedAlert.attributes.apiKey;
  const attributes = decryptedAlert.attributes;
  const version = decryptedAlert.version;
  const references = decryptedAlert.references;

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      // operation: ReadOperations.AdHocRun,
      operation: WriteOperations.Enable,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        // action: RuleAuditAction.AD_HOC_RUN,
        action: RuleAuditAction.ENABLE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.AD_HOC_RUN,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  if (attributes.enabled === false) {
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: id,
      actions: attributes.actions,
      references,
      attributes,
    });

    const username = await context.getUserName();
    const now = new Date();

    const schedule = attributes.schedule as IntervalSchedule;

    const updateAttributes = updateMeta(context, {
      ...attributes,
      ...(!existingApiKey &&
        (await createNewAPIKeySet(context, {
          id: attributes.alertTypeId,
          ruleName: attributes.name,
          username,
          shouldUpdateApiKey: true,
        }))),
      ...(attributes.monitoring && {
        monitoring: resetMonitoringLastRun(attributes.monitoring),
      }),
      nextRun: getNextRun({ interval: schedule.interval }),
      updatedBy: username,
      updatedAt: now.toISOString(),
      executionStatus: {
        status: 'pending',
        lastDuration: 0,
        lastExecutionDate: now.toISOString(),
        error: null,
        warning: null,
      },
    });

    try {
      // to mitigate AAD issues(actions property is not used for encrypting API key in partial SO update)
      // we call create with overwrite=true
      if (migratedActions.hasLegacyActions) {
        await context.unsecuredSavedObjectsClient.create<RawRule>(
          'alert',
          {
            ...updateAttributes,
            actions: migratedActions.resultedActions,
            throttle: undefined,
            notifyWhen: undefined,
          },
          {
            id,
            overwrite: true,
            version,
            references: migratedActions.resultedReferences,
          }
        );
      } else {
        await context.unsecuredSavedObjectsClient.update('alert', id, updateAttributes, {
          version,
        });
      }
    } catch (e) {
      throw e;
    }
  }

  try {
    await scheduleAdHocTask(context, {
      id,
      consumer: attributes.consumer,
      ruleTypeId: attributes.alertTypeId,
      schedule: attributes.schedule as IntervalSchedule,
      throwOnConflict: false,
      adHocOptions: {
        from,
        to,
        actions,
        maxSignals,
      },
    });
  } catch (err) {
    return i18n.translate('xpack.alerting.rulesClient.adHocRun.adHocRunError', {
      defaultMessage: 'Error running rule: {errMessage}',
      values: {
        errMessage: err.message,
      },
    });
  }
}
