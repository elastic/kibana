/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NewAlertParams } from './alerts';
import { RuleAction as RuleActionOrig } from '../../../../triggers_actions_ui/public';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants/alerts';
import { MonitorStatusTranslations } from '../../../common/translations';
import {
  IndexActionParams,
  PagerDutyActionParams,
  ServerLogActionParams,
  ServiceNowActionParams,
  JiraActionParams,
  WebhookActionParams,
  EmailActionParams,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../actions/server';
import { ActionTypeId } from '../../components/settings/types';
import { Ping } from '../../../common/runtime_types/ping';
import { DefaultEmail } from '../../../common/runtime_types';

export const SLACK_ACTION_ID: ActionTypeId = '.slack';
export const PAGER_DUTY_ACTION_ID: ActionTypeId = '.pagerduty';
export const SERVER_LOG_ACTION_ID: ActionTypeId = '.server-log';
export const INDEX_ACTION_ID: ActionTypeId = '.index';
export const TEAMS_ACTION_ID: ActionTypeId = '.teams';
export const SERVICE_NOW_ACTION_ID: ActionTypeId = '.servicenow';
export const JIRA_ACTION_ID: ActionTypeId = '.jira';
export const WEBHOOK_ACTION_ID: ActionTypeId = '.webhook';
export const EMAIL_ACTION_ID: ActionTypeId = '.email';

const { MONITOR_STATUS } = ACTION_GROUP_DEFINITIONS;

export type RuleAction = Omit<RuleActionOrig, 'actionTypeId'>;

const getRecoveryMessage = (selectedMonitor: Ping) => {
  return i18n.translate('xpack.uptime.alerts.monitorStatus.recoveryMessage', {
    defaultMessage: 'Monitor {monitor} with url {url} has recovered with status Up',
    values: {
      monitor: selectedMonitor?.monitor?.name || selectedMonitor?.monitor?.id,
      url: selectedMonitor?.url?.full,
    },
  });
};

export function populateAlertActions({
  defaultActions,
  selectedMonitor,
  defaultEmail,
}: NewAlertParams) {
  const actions: RuleAction[] = [];
  defaultActions.forEach((aId) => {
    const action: RuleAction = {
      id: aId.id,
      group: MONITOR_STATUS.id,
      params: {},
    };

    const recoveredAction: RuleAction = {
      id: aId.id,
      group: 'recovered',
      params: {
        message: getRecoveryMessage(selectedMonitor),
      },
    };

    switch (aId.actionTypeId) {
      case PAGER_DUTY_ACTION_ID:
        action.params = getPagerDutyActionParams(selectedMonitor);
        recoveredAction.params = getPagerDutyActionParams(selectedMonitor, true);
        actions.push(recoveredAction);
        break;
      case SERVER_LOG_ACTION_ID:
        action.params = getServerLogActionParams(selectedMonitor);
        recoveredAction.params = getServerLogActionParams(selectedMonitor, true);
        actions.push(recoveredAction);
        break;
      case INDEX_ACTION_ID:
        action.params = getIndexActionParams(selectedMonitor);
        recoveredAction.params = getIndexActionParams(selectedMonitor, true);
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
        action.params = getWebhookActionParams(selectedMonitor);
        recoveredAction.params = getWebhookActionParams(selectedMonitor, true);
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
          action.params = getEmailActionParams(defaultEmail, selectedMonitor);
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

function getIndexActionParams(selectedMonitor: Ping, recovery = false): IndexActionParams {
  if (recovery) {
    return {
      documents: [
        {
          monitorName: '{{state.monitorName}}',
          monitorUrl: '{{{state.monitorUrl}}}',
          statusMessage: getRecoveryMessage(selectedMonitor),
          latestErrorMessage: '',
          observerLocation: '{{state.observerLocation}}',
        },
      ],
      indexOverride: null,
    };
  }
  return {
    documents: [
      {
        monitorName: '{{state.monitorName}}',
        monitorUrl: '{{{state.monitorUrl}}}',
        statusMessage: '{{{state.statusMessage}}}',
        latestErrorMessage: '{{{state.latestErrorMessage}}}',
        observerLocation: '{{state.observerLocation}}',
      },
    ],
    indexOverride: null,
  };
}

function getServerLogActionParams(selectedMonitor: Ping, recovery = false): ServerLogActionParams {
  if (recovery) {
    return {
      level: 'info',
      message: getRecoveryMessage(selectedMonitor),
    };
  }
  return {
    level: 'warn',
    message: MonitorStatusTranslations.defaultActionMessage,
  };
}

function getWebhookActionParams(selectedMonitor: Ping, recovery = false): WebhookActionParams {
  return {
    body: recovery
      ? getRecoveryMessage(selectedMonitor)
      : MonitorStatusTranslations.defaultActionMessage,
  };
}

function getPagerDutyActionParams(selectedMonitor: Ping, recovery = false): PagerDutyActionParams {
  if (recovery) {
    return {
      dedupKey: selectedMonitor.monitor.id + MONITOR_STATUS.id,
      eventAction: 'resolve',
      summary: getRecoveryMessage(selectedMonitor),
    };
  }
  return {
    dedupKey: selectedMonitor.monitor.id + MONITOR_STATUS.id,
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

function getEmailActionParams(
  defaultEmail: DefaultEmail,
  selectedMonitor: Ping
): EmailActionParams {
  return {
    to: defaultEmail.to,
    subject: i18n.translate('xpack.uptime.monitor.simpleStatusAlert.email.subject', {
      defaultMessage: 'Monitor {monitor} with url {url} is down',
      values: {
        monitor: selectedMonitor?.monitor?.name || selectedMonitor?.monitor?.id,
        url: selectedMonitor?.url?.full,
      },
    }),
    message: MonitorStatusTranslations.defaultActionMessage,
    cc: defaultEmail.cc ?? [],
    bcc: defaultEmail.bcc ?? [],
    kibanaFooterLink: {
      path: '',
      text: '',
    },
  };
}
