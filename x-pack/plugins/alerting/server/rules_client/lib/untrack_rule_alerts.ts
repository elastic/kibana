/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import { Rule } from '../../../common';
import { SanitizedRule, RawAlertInstance as RawAlert } from '../../types';
import { taskInstanceToAlertTaskInstance } from '../../task_runner/alert_task_instance';
import { Alert } from '../../alert';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { createAlertEventLogRecordObject } from '../../lib/create_alert_event_log_record_object';
import { RulesClientContext } from '../types';

export const untrackRuleAlerts = async (
  context: RulesClientContext,
  id: string,
  attributes: Rule,
  alertIds?: string[] // If no alertIds are passed, untrack ALL ids by default
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

      const untrackedAlertIds = Object.keys(untrackedAlerts).filter(
        (alertId) => !alertIds || alertIds.includes(alertId)
      );

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
              type: 'alert',
              typeId: attributes.alertTypeId,
              relation: SAVED_OBJECT_REL_PRIMARY,
            },
          ],
        });
        context.eventLogger.logEvent(event);
      }

      // Untrack Lifecycle alerts (Alerts As Data-enabled)
      if (isLifecycleAlert) {
        const alertsClient = await context.alertsService?.createAlertsClient({
          namespace: context.namespace!,
          rule: {
            id,
            name: attributes.name,
            consumer: attributes.consumer,
            revision: attributes.revision,
            spaceId: context.spaceId,
            tags: attributes.tags,
            parameters: attributes.params,
            executionId: '',
          },
          ruleType,
          logger: context.logger,
        });
        if (!alertsClient) throw new Error('Could not create alertsClient');
        const indices = context.getAlertIndicesAlias([ruleType.id], context.spaceId);
        await alertsClient.setAlertStatusToUntracked(indices, [id], alertIds);
      }
    } catch (error) {
      // this should not block the rest of the disable process
      context.logger.warn(
        `rulesClient.disable('${id}') - Could not write untrack events - ${error.message}`
      );
    }
  });
};
