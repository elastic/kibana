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
import { v4 as uuidv4 } from 'uuid';

import { ActionConnector, ActionTypeId } from './types';
import { DefaultEmail } from '../runtime_types';

export const SLACK_WEBHOOK_ACTION_ID: ActionTypeId = '.slack';
export const PAGER_DUTY_ACTION_ID: ActionTypeId = '.pagerduty';
export const SERVER_LOG_ACTION_ID: ActionTypeId = '.server-log';
export const INDEX_ACTION_ID: ActionTypeId = '.index';
export const TEAMS_ACTION_ID: ActionTypeId = '.teams';
export const SERVICE_NOW_ACTION_ID: ActionTypeId = '.servicenow';
export const JIRA_ACTION_ID: ActionTypeId = '.jira';
export const WEBHOOK_ACTION_ID: ActionTypeId = '.webhook';
export const EMAIL_ACTION_ID: ActionTypeId = '.email';

export type RuleAction = Omit<RuleActionOrig, 'actionTypeId'>;

interface Translations {
  defaultActionMessage: string;
  defaultRecoveryMessage: string;
  defaultSubjectMessage: string;
  defaultRecoverySubjectMessage: string;
}

export function populateAlertActions({
  defaultActions,
  defaultEmail,
  groupId,
  translations,
  isLegacy = false,
}: {
  groupId: string;
  defaultActions: ActionConnector[];
  defaultEmail?: DefaultEmail;
  translations: Translations;
  isLegacy?: boolean;
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
        message: translations.defaultRecoveryMessage,
      },
    };

    switch (aId.actionTypeId) {
      case PAGER_DUTY_ACTION_ID:
        const dedupKey = uuidv4();
        action.params = getPagerDutyActionParams(translations, dedupKey);
        recoveredAction.params = getPagerDutyActionParams(translations, dedupKey, true);
        actions.push(recoveredAction);
        break;
      case SERVER_LOG_ACTION_ID:
        action.params = getServerLogActionParams(translations);
        recoveredAction.params = getServerLogActionParams(translations, true);
        actions.push(recoveredAction);
        break;
      case INDEX_ACTION_ID:
        action.params = getIndexActionParams(translations, false, isLegacy);
        recoveredAction.params = getIndexActionParams(translations, true, isLegacy);
        actions.push(recoveredAction);
        break;
      case SERVICE_NOW_ACTION_ID:
        action.params = getServiceNowActionParams(translations);
        // Recovery action for service now is not implemented yet
        break;
      case JIRA_ACTION_ID:
        action.params = getJiraActionParams(translations);
        // Recovery action for Jira is not implemented yet
        break;
      case WEBHOOK_ACTION_ID:
        action.params = getWebhookActionParams(translations);
        recoveredAction.params = getWebhookActionParams(translations, true);
        actions.push(recoveredAction);
        break;
      case SLACK_WEBHOOK_ACTION_ID:
      case TEAMS_ACTION_ID:
        action.params = {
          message: translations.defaultActionMessage,
        };
        actions.push(recoveredAction);
        break;
      case EMAIL_ACTION_ID:
        if (defaultEmail) {
          action.params = getEmailActionParams(translations, defaultEmail);
          recoveredAction.params = getEmailActionParams(translations, defaultEmail, true);
          actions.push(recoveredAction);
        }
        break;
      default:
        action.params = {
          message: translations.defaultActionMessage,
        };
    }

    actions.push(action);
  });

  return actions;
}

function getIndexActionParams(
  translations: Translations,
  recovery = false,
  isLegacy = false
): IndexActionParams {
  if (isLegacy && recovery) {
    return {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: translations.defaultRecoveryMessage,
          latestErrorMessage: '',
          observerLocation: '{{context.observerLocation}}',
        },
      ],
      indexOverride: null,
    };
  }

  if (isLegacy) {
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

  if (recovery) {
    return {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: '{{{context.status}}}',
          latestErrorMessage: '{{{context.latestErrorMessage}}}',
          observerLocation: '{{context.locationName}}',
          recoveryReason: '{{context.recoveryReason}}',
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
        statusMessage: '{{{context.status}}}',
        latestErrorMessage: '{{{context.lastErrorMessage}}}',
        observerLocation: '{{context.locationName}}',
      },
    ],
    indexOverride: null,
  };
}

function getServerLogActionParams(
  { defaultActionMessage, defaultRecoveryMessage }: Translations,
  recovery = false
): ServerLogActionParams {
  if (recovery) {
    return {
      level: 'info',
      message: defaultRecoveryMessage,
    };
  }
  return {
    level: 'warn',
    message: defaultActionMessage,
  };
}

function getWebhookActionParams(
  { defaultActionMessage, defaultRecoveryMessage }: Translations,
  recovery = false
): WebhookActionParams {
  return {
    body: recovery ? defaultRecoveryMessage : defaultActionMessage,
  };
}

function getPagerDutyActionParams(
  { defaultActionMessage, defaultRecoveryMessage }: Translations,
  dedupKey: string,
  recovery = false
): PagerDutyActionParams {
  if (recovery) {
    return {
      dedupKey,
      eventAction: 'resolve',
      summary: defaultRecoveryMessage,
    };
  }
  return {
    dedupKey,
    eventAction: 'trigger',
    severity: 'error',
    summary: defaultActionMessage,
  };
}

function getServiceNowActionParams({ defaultActionMessage }: Translations): ServiceNowActionParams {
  return {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        short_description: defaultActionMessage,
        description: defaultActionMessage,
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

function getJiraActionParams({ defaultActionMessage }: Translations): JiraActionParams {
  return {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        summary: defaultActionMessage,
        externalId: null,
        description: defaultActionMessage,
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
  {
    defaultActionMessage,
    defaultSubjectMessage,
    defaultRecoverySubjectMessage,
    defaultRecoveryMessage,
  }: Translations,
  defaultEmail: DefaultEmail,
  isRecovery?: boolean
): EmailActionParams {
  return {
    to: defaultEmail.to,
    subject: isRecovery ? defaultRecoverySubjectMessage : defaultSubjectMessage,
    message: isRecovery ? defaultRecoveryMessage : defaultActionMessage,
    cc: defaultEmail.cc ?? [],
    bcc: defaultEmail.bcc ?? [],
    kibanaFooterLink: {
      path: '',
      text: '',
    },
  };
}
