/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewAlertParams } from './alerts';
import { AlertAction } from '../../../../triggers_actions_ui/public';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants/alerts';
import { MonitorStatusTranslations } from '../../../common/translations';

const { MONITOR_STATUS } = ACTION_GROUP_DEFINITIONS;

export function populateAlertActions({ defaultActions, monitorId, monitorName }: NewAlertParams) {
  const actions: AlertAction[] = [];
  defaultActions.forEach((aId) => {
    const action: AlertAction = {
      id: aId.id,
      actionTypeId: aId.actionTypeId,
      group: MONITOR_STATUS.id,
      params: {},
    };
    switch (aId.actionTypeId) {
      case '.pagerduty':
        action.params = getPagerDutyActionParams(monitorId);
        break;
      case '.server-log':
        action.params = {
          level: 'warn',
          message: MonitorStatusTranslations.defaultActionMessage,
        };
        break;
      case '.index':
        action.params = {
          documents: [
            {
              monitorName: '{{state.monitorName}}',
              monitorUrl: '{{{state.monitorUrl}}}',
              statusMessage: '{{state.statusMessage}}',
              latestErrorMessage: '{{{state.latestErrorMessage}}}',
              observerLocation: '{{state.observerLocation}}',
            },
          ],
        };
        break;
      case '.servicenow':
        action.params = {
          subAction: 'pushToService',
          subActionParams: {
            incident: {
              short_description: MonitorStatusTranslations.defaultActionMessage,
              description: MonitorStatusTranslations.defaultActionMessage,
              impact: '2',
              severity: '2',
              urgency: '2',
            },
            comments: [],
          },
        };
        break;
      case '.jira':
        action.params = {
          subAction: 'pushToService',
          subActionParams: {
            incident: { summary: MonitorStatusTranslations.defaultActionMessage },
            comments: [],
          },
        };
        break;
      case '.webhook':
        action.params = {
          body: MonitorStatusTranslations.defaultActionMessage,
        };
        break;
      case '.slack':
      case '.teams':
      default:
        action.params = {
          message: MonitorStatusTranslations.defaultActionMessage,
        };
    }

    actions.push(action);
  });

  return actions;
}

function getPagerDutyActionParams(monitorId: string) {
  return {
    dedupKey: monitorId + MONITOR_STATUS.id,
    eventAction: 'trigger',
    severity: 'error',
    summary: MonitorStatusTranslations.defaultActionMessage,
  };
}
