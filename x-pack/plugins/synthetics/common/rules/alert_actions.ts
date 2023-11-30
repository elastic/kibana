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

import type { MonitorConnectors } from '../../server/routes/default_alerts/default_alert_service';
import { ActionConnector, ActionTypeId } from './types';
import { DefaultEmail, DynamicSettings } from '../runtime_types';

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

const getKql = (configIds: string[] = []) => {
  const kql =
    configIds?.length > 0
      ? `configId: (${configIds.join(' or ')}) and monitor.custom_connectors: true`
      : 'monitor.custom_connectors: false';

  return {
    query: {
      kql,
      filters: [],
    },
  };
};

export function populateAlertActions({
  allActionConnectors,
  settings,
  groupId,
  translations,
  monitorConnectors: monitorConnectorsList,
  existingActions,
}: {
  groupId: string;
  allActionConnectors: ActionConnector[];
  settings?: DynamicSettings;
  translations: Translations;
  monitorConnectors?: MonitorConnectors[];
  existingActions?: RuleAction[];
}) {
  const defaultActions = (allActionConnectors ?? []).filter((act) =>
    settings?.defaultConnectors?.includes(act.id)
  );

  let actions: RuleAction[] = [...(existingActions ?? [])];

  const getRuleAction = (aId: ActionConnector, configIds: string[] = []) => {
    const action: RuleAction = {
      id: aId.id,
      group: groupId,
      params: {},
      frequency: {
        notifyWhen: 'onActionGroupChange',
        throttle: null,
        summary: false,
      },
      alertsFilter: getKql(configIds),
    };

    const recoveredAction: RuleAction = {
      id: aId.id,
      group: 'recovered',
      params: {
        message: translations.defaultRecoveryMessage,
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        throttle: null,
        summary: false,
      },
      alertsFilter: getKql(configIds),
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
        action.params = getIndexActionParams(translations, false);
        recoveredAction.params = getIndexActionParams(translations, true);
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
        if (settings?.defaultEmail) {
          action.params = getEmailActionParams(translations, settings.defaultEmail);
          recoveredAction.params = getEmailActionParams(translations, settings.defaultEmail, true);
          actions.push(recoveredAction);
        }
        break;
      default:
        action.params = {
          message: translations.defaultActionMessage,
        };
    }
    action.params.configIds = configIds;
    recoveredAction.params.configIds = configIds;
    actions.push(action);
  };

  // remove the defaultActions
  actions = actions.filter((action) => {
    const configs = (action.params.configIds as string[]) ?? [];
    return configs.length > 0 || !settings?.defaultConnectors?.includes(action.id);
  });

  defaultActions.forEach((aId) => {
    getRuleAction(aId);
  });

  if (defaultActions.length === 0) {
    actions = actions.filter((action) => {
      return ((action.params.configIds as string[]) ?? []).length > 0;
    });
  }
  // remove the ones not part of defaultActions
  actions = actions.filter((action) => {
    const configs = (action.params.configIds as string[]) ?? [];
    return !(configs.length === 0 && !settings?.defaultConnectors?.includes(action.id));
  });

  // combine the configId

  const addedConnectorsByConfigs: Record<string, string[]> = {};
  const removedConnectorsByConfigs: Record<string, string[]> = {};

  (monitorConnectorsList ?? []).forEach((monitorConnectors) => {
    const configId = monitorConnectors.configId;
    if (configId) {
      monitorConnectors?.addedConnectors?.forEach((monitorConnector) => {
        if (addedConnectorsByConfigs[monitorConnector]) {
          addedConnectorsByConfigs[monitorConnector].push(configId);
        } else {
          addedConnectorsByConfigs[monitorConnector] = [configId];
        }
      });
      monitorConnectors?.removedConnectors?.forEach((monitorConnector) => {
        if (removedConnectorsByConfigs[monitorConnector]) {
          removedConnectorsByConfigs[monitorConnector].push(configId);
        } else {
          removedConnectorsByConfigs[monitorConnector] = [configId];
        }
      });
    }
  });

  const getBothActions = (connectId: string) => {
    const currentAction = actions.find((act) => {
      return (
        act.id === connectId &&
        act.group === groupId &&
        ((act.params?.configIds as string[]) ?? []).length > 0
      );
    });
    const recoveredAction = actions.find((act) => {
      return (
        act.id === connectId &&
        act.group === 'recovered' &&
        ((act.params?.configIds as string[]) ?? []).length > 0
      );
    });
    return { currentAction, recoveredAction };
  };

  Object.keys(addedConnectorsByConfigs).forEach((connectId) => {
    const action = allActionConnectors.find((act) => act.id === connectId);
    if (action) {
      const configIds = addedConnectorsByConfigs[connectId];
      const { currentAction, recoveredAction } = getBothActions(connectId);
      if (currentAction) {
        const paramConfigs = (currentAction?.params.configIds ?? []) as string[];
        const newConfigIds = Array.from(new Set([...paramConfigs, ...configIds]));
        currentAction.params.configIds = newConfigIds;
        currentAction.alertsFilter = getKql(newConfigIds);
        if (recoveredAction) {
          recoveredAction.params.configIds = newConfigIds;
          recoveredAction.alertsFilter = getKql(newConfigIds);
        }
      } else {
        getRuleAction(action, configIds);
      }
    }
  });

  Object.keys(removedConnectorsByConfigs).forEach((connectId) => {
    const action = allActionConnectors.find((act) => act.id === connectId);
    if (action) {
      const configIds = removedConnectorsByConfigs[connectId];
      const { currentAction, recoveredAction } = getBothActions(connectId);
      const paramConfigs = (currentAction?.params.configIds ?? []) as string[];
      const newConfigIds = paramConfigs.filter((configId) => !configIds.includes(configId));
      if (currentAction && newConfigIds.length > 0) {
        currentAction.params.configIds = Array.from(newConfigIds);
        currentAction.alertsFilter = getKql(Array.from(newConfigIds));
        if (recoveredAction) {
          recoveredAction.params.configIds = Array.from(newConfigIds);
          recoveredAction.alertsFilter = getKql(Array.from(newConfigIds));
        }
      } else {
        // remove all matching actions
        actions = actions.filter((act) => {
          return act.id !== connectId || ((act.params?.configIds as string[]) ?? []).length === 0;
        });
      }
    }
  });

  return actions;
}

function getIndexActionParams(translations: Translations, recovery = false): IndexActionParams {
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
    messageHTML: null,
    cc: defaultEmail.cc ?? [],
    bcc: defaultEmail.bcc ?? [],
    kibanaFooterLink: {
      path: '',
      text: '',
    },
  };
}
