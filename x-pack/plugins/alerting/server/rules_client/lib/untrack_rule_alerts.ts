/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import { SanitizedRule, RawAlertInstance as RawAlert, RawRule } from '../../types';
import { taskInstanceToAlertTaskInstance } from '../../task_runner/alert_task_instance';
import { Alert } from '../../alert';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { createAlertEventLogRecordObject } from '../../lib/create_alert_event_log_record_object';
import { RulesClientContext } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export const untrackRuleAlerts = async (
  context: RulesClientContext,
  id: string,
  attributes: RawRule
) => {
  return withSpan({ name: 'untrackRuleAlerts', type: 'rules' }, async () => {
    if (!context.eventLogger || !attributes.scheduledTaskId) return;

    try {
      const taskInstance = taskInstanceToAlertTaskInstance(
        await context.taskManager.get(attributes.scheduledTaskId),
        attributes as unknown as SanitizedRule
      );

      const { state } = taskInstance;

      const untrackedAlerts = mapValues<Record<string, RawAlert>, Alert>(
        state.alertInstances ?? {},
        (rawAlertInstance, alertId) => new Alert(alertId, rawAlertInstance)
      );

      const untrackedAlertIds = Object.keys(untrackedAlerts);

      const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId);

      const { autoRecoverAlerts: isLifecycleAlert } = ruleType;

      // Untrack Stack alerts
      // TODO: Replace this loop with an Alerts As Data implmentation when Stack Rules use Alerts As Data
      // instead of the Kibana Event Log
      for (const alertId of untrackedAlertIds) {
        const { group: actionGroup } = untrackedAlerts[alertId].getLastScheduledActions() ?? {};
        const instanceState = untrackedAlerts[alertId].getState();
        const message = `instance '${alertId}' has been untracked because the rule was disabled`;
        const alertUuid = untrackedAlerts[alertId].getUuid();

        const event = createAlertEventLogRecordObject({
          ruleId: id,
          ruleName: attributes.name,
          ruleRevision: attributes.revision,
          ruleType,
          consumer: attributes.consumer,
          instanceId: alertId,
          alertUuid,
          action: EVENT_LOG_ACTIONS.untrackedInstance,
          message,
          state: instanceState,
          group: actionGroup,
          namespace: context.namespace,
          spaceId: context.spaceId,
          savedObjects: [
            {
              id,
              type: RULE_SAVED_OBJECT_TYPE,
              typeId: attributes.alertTypeId,
              relation: SAVED_OBJECT_REL_PRIMARY,
            },
          ],
        });
        context.eventLogger.logEvent(event);
      }

      // Untrack Lifecycle alerts (Alerts As Data-enabled)
      if (isLifecycleAlert) {
        const indices = context.getAlertIndicesAlias([ruleType.id], context.spaceId);
        if (!context.alertsService)
          throw new Error('Could not access alertsService to untrack alerts');
        await context.alertsService.setAlertsToUntracked({ indices, ruleIds: [id] });
      }
    } catch (error) {
      // this should not block the rest of the disable process
      context.logger.warn(
        `rulesClient.disableRule('${id}') - Could not write untrack events - ${error.message}`
      );
    }
  });
};
