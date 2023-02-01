/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import { RawRule, SanitizedRule, RawAlertInstance as RawAlert } from '../../types';
import { taskInstanceToAlertTaskInstance } from '../../task_runner/alert_task_instance';
import { Alert } from '../../alert';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { createAlertEventLogRecordObject } from '../../lib/create_alert_event_log_record_object';
import { RulesClientContext } from '../types';

export const recoverRuleAlerts = async (
  context: RulesClientContext,
  id: string,
  attributes: RawRule
) => {
  return withSpan({ name: 'recoverRuleAlerts', type: 'rules' }, async () => {
    if (!context.eventLogger || !attributes.scheduledTaskId) return;
    try {
      const { state } = taskInstanceToAlertTaskInstance(
        await context.taskManager.get(attributes.scheduledTaskId),
        attributes as unknown as SanitizedRule
      );

      const recoveredAlerts = mapValues<Record<string, RawAlert>, Alert>(
        state.alertInstances ?? {},
        (rawAlertInstance, alertId) => new Alert(alertId, rawAlertInstance)
      );
      const recoveredAlertIds = Object.keys(recoveredAlerts);

      for (const alertId of recoveredAlertIds) {
        const { group: actionGroup } = recoveredAlerts[alertId].getLastScheduledActions() ?? {};
        const instanceMeta = recoveredAlerts[alertId].getMeta();
        const message = `instance '${alertId}' has recovered due to the rule was disabled`;

        const event = createAlertEventLogRecordObject({
          ruleId: id,
          ruleName: attributes.name,
          ruleType: context.ruleTypeRegistry.get(attributes.alertTypeId),
          consumer: attributes.consumer,
          instanceId: alertId,
          action: EVENT_LOG_ACTIONS.recoveredInstance,
          message,
          meta: instanceMeta,
          group: actionGroup,
          namespace: context.namespace,
          spaceId: context.spaceId,
          savedObjects: [
            {
              id,
              type: 'alert',
              typeId: attributes.alertTypeId,
              relation: SAVED_OBJECT_REL_PRIMARY,
            },
          ],
        });
        context.eventLogger.logEvent(event);
      }
    } catch (error) {
      // this should not block the rest of the disable process
      context.logger.warn(
        `rulesClient.disable('${id}') - Could not write recovery events - ${error.message}`
      );
    }
  });
};
