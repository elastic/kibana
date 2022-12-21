/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndexActionParams,
  PagerDutyActionParams,
  ServerLogActionParams,
  ServiceNowActionParams,
  JiraActionParams,
  WebhookActionParams,
  EmailActionParams,
} from '@kbn/stack-connectors-plugin/server/connector_types';
import { RuleAction as RuleActionOrig } from '@kbn/alerting-plugin/common';
import uuid from 'uuid';

import { ActionConnector, ActionTypeId } from './types';
import { MonitorStatusTranslations } from '../translations';
import { DefaultEmail } from '../runtime_types';

export const SLACK_ACTION_ID: ActionTypeId = '.slack';
export const PAGER_DUTY_ACTION_ID: ActionTypeId = '.pagerduty';
export const SERVER_LOG_ACTION_ID: ActionTypeId = '.server-log';
export const INDEX_ACTION_ID: ActionTypeId = '.index';
export const TEAMS_ACTION_ID: ActionTypeId = '.teams';
export const SERVICE_NOW_ACTION_ID: ActionTypeId = '.servicenow';
export const JIRA_ACTION_ID: ActionTypeId = '.jira';
export const WEBHOOK_ACTION_ID: ActionTypeId = '.webhook';
export const EMAIL_ACTION_ID: ActionTypeId = '.email';

export type RuleAction = Omit<RuleActionOrig, 'actionTypeId'>;

export function populateAlertActions({
  defaultActions,
  defaultEmail,
  groupId,
}: {
  groupId: string;
  defaultActions: ActionConnector[];
  defaultEmail?: DefaultEmail;
}) {
  const actions: RuleAction[] = [];
  defaultActions.forEach((aId) => {
    const action: RuleAction = {
      id: aId.id,
      group: groupId,
      params: {},
    };

    const recoveredAction: RuleAction = {
      id: aId.id,
      group: 'recovered',
      params: {
        message: MonitorStatusTranslations.defaultRecoveryMessage,
      },
    };

    switch (aId.actionTypeId) {
      case PAGER_DUTY_ACTION_ID:
        const dedupKey = uuid.v4();
        action.params = getPagerDutyActionParams(dedupKey);
        recoveredAction.params = getPagerDutyActionParams(dedupKey, true);
        actions.push(recoveredAction);
        break;
      case SERVER_LOG_ACTION_ID:
        action.params = getServerLogActionParams();
        recoveredAction.params = getServerLogActionParams(true);
        actions.push(recoveredAction);
        break;
      case INDEX_ACTION_ID:
        action.params = getIndexActionParams();
        recoveredAction.params = getIndexActionParams(true);
        actions.push(recoveredAction);
        break;
      case SERVICE_NOW_ACTION_ID:
        action.params = getServiceNowActionParams();
        // Recovery action for service now is not implemented yet
        break;
      case JIRA_ACTION_ID:
        action.params = getJiraActionParams();
        // Recovery action for Jira is not implemented yet
        break;
      case WEBHOOK_ACTION_ID:
        action.params = getWebhookActionParams();
        recoveredAction.params = getWebhookActionParams(true);
        actions.push(recoveredAction);
        break;
      case SLACK_ACTION_ID:
      case TEAMS_ACTION_ID:
        action.params = {
          message: MonitorStatusTranslations.defaultActionMessage,
        };
        actions.push(recoveredAction);
        break;
      case EMAIL_ACTION_ID:
        if (defaultEmail) {
          action.params = getEmailActionParams(defaultEmail);
        }
        break;
      default:
        action.params = {
          message: MonitorStatusTranslations.defaultActionMessage,
        };
    }

    actions.push(action);
  });

  return actions;
}

function getIndexActionParams(recovery = false): IndexActionParams {
  if (recovery) {
    return {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: MonitorStatusTranslations.defaultRecoveryMessage,
          latestErrorMessage: '',
          observerLocation: '{{context.observerLocation}}',
        },
      ],
      indexOverride: null,
    };
  }
  return {
    documents: [
      {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        statusMessage: '{{{context.statusMessage}}}',
        latestErrorMessage: '{{{context.latestErrorMessage}}}',
        observerLocation: '{{context.observerLocation}}',
      },
    ],
    indexOverride: null,
  };
}

function getServerLogActionParams(recovery = false): ServerLogActionParams {
  if (recovery) {
    return {
      level: 'info',
      message: MonitorStatusTranslations.defaultRecoveryMessage,
    };
  }
  return {
    level: 'warn',
    message: MonitorStatusTranslations.defaultActionMessage,
  };
}

function getWebhookActionParams(recovery = false): WebhookActionParams {
  return {
    body: recovery
      ? MonitorStatusTranslations.defaultRecoveryMessage
      : MonitorStatusTranslations.defaultActionMessage,
  };
}

function getPagerDutyActionParams(dedupKey: string, recovery = false): PagerDutyActionParams {
  if (recovery) {
    return {
      dedupKey,
      eventAction: 'resolve',
      summary: MonitorStatusTranslations.defaultRecoveryMessage,
    };
  }
  return {
    dedupKey,
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
        category: null,
        subcategory: null,
        externalId: null,
        correlation_id: null,
        correlation_display: null,
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

function getEmailActionParams(defaultEmail: DefaultEmail): EmailActionParams {
  return {
    to: defaultEmail.to,
    subject: MonitorStatusTranslations.defaultSubjectMessage,
    message: MonitorStatusTranslations.defaultActionMessage,
    cc: defaultEmail.cc ?? [],
    bcc: defaultEmail.bcc ?? [],
    kibanaFooterLink: {
      path: '',
      text: '',
    },
  };
}
