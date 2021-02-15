/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewAlertParams } from './alerts';
import { AlertAction } from '../../../../triggers_actions_ui/public';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants/alerts';
import { MonitorStatusTranslations } from '../../../common/translations';
import {
  IndexActionParams,
  PagerDutyActionParams,
  ServerLogActionParams,
  ServiceNowActionParams,
  JiraActionParams,
  WebhookActionParams,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../actions/server';
import { ActionTypeId } from '../../components/settings/types';

export const SLACK_ACTION_ID: ActionTypeId = '.slack';
export const PAGER_DUTY_ACTION_ID: ActionTypeId = '.pagerduty';
export const SERVER_LOG_ACTION_ID: ActionTypeId = '.server-log';
export const INDEX_ACTION_ID: ActionTypeId = '.index';
export const TEAMS_ACTION_ID: ActionTypeId = '.teams';
export const SERVICE_NOW_ACTION_ID: ActionTypeId = '.servicenow';
export const JIRA_ACTION_ID: ActionTypeId = '.jira';
export const WEBHOOK_ACTION_ID: ActionTypeId = '.webhook';

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
      case PAGER_DUTY_ACTION_ID:
        action.params = getPagerDutyActionParams(monitorId);
        break;
      case SERVER_LOG_ACTION_ID:
        action.params = getServerLogActionParams();
        break;
      case INDEX_ACTION_ID:
        action.params = getIndexActionParams();
        break;
      case SERVICE_NOW_ACTION_ID:
        action.params = getServiceNowActionParams();
        break;
      case JIRA_ACTION_ID:
        action.params = getJiraActionParams();
        break;
      case WEBHOOK_ACTION_ID:
        action.params = getWebhookActionParams();
        break;
      case SLACK_ACTION_ID:
      case TEAMS_ACTION_ID:
      default:
        action.params = {
          message: MonitorStatusTranslations.defaultActionMessage,
        };
    }

    actions.push(action);
  });

  return actions;
}

function getIndexActionParams(): IndexActionParams {
  return {
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
}

function getServerLogActionParams(): ServerLogActionParams {
  return {
    level: 'warn',
    message: MonitorStatusTranslations.defaultActionMessage,
  };
}

function getWebhookActionParams(): WebhookActionParams {
  return {
    body: MonitorStatusTranslations.defaultActionMessage,
  };
}

function getPagerDutyActionParams(monitorId: string): PagerDutyActionParams {
  return {
    dedupKey: monitorId + MONITOR_STATUS.id,
    eventAction: 'trigger',
    severity: 'error',
    summary: MonitorStatusTranslations.defaultActionMessage,
  };
}

function getServiceNowActionParams(): ServiceNowActionParams {
  return {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        short_description: MonitorStatusTranslations.defaultActionMessage,
        description: MonitorStatusTranslations.defaultActionMessage,
        impact: '2',
        severity: '2',
        urgency: '2',
        externalId: null,
      },
      comments: [],
    },
  };
}

function getJiraActionParams(): JiraActionParams {
  return {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        summary: MonitorStatusTranslations.defaultActionMessage,
        externalId: null,
        description: MonitorStatusTranslations.defaultActionMessage,
        issueType: null,
        priority: '2',
        labels: null,
        parent: null,
      },
      comments: [],
    },
  };
}
