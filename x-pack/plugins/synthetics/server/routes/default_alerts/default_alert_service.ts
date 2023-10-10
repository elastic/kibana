/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { getAllMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { savedObjectsAdapter } from '../../saved_objects';
import { populateAlertActions, RuleAction } from '../../../common/rules/alert_actions';
import {
  SyntheticsMonitorStatusTranslations,
  TlsTranslations,
} from '../../../common/rules/synthetics/translations';
import { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../../types';
import {
  ACTION_GROUP_DEFINITIONS,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { AlertConfigKey, ConfigKey } from '../../../common/constants/monitor_management';

type DefaultRuleType = typeof SYNTHETICS_STATUS_RULE | typeof SYNTHETICS_TLS_RULE;
export interface MonitorConnectors {
  addedConnectors?: string[];
  removedConnectors?: string[];
  configId?: string;
}
export class DefaultAlertService {
  context: UptimeRequestHandlerContext;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;

  constructor(
    context: UptimeRequestHandlerContext,
    server: SyntheticsServerSetup,
    soClient: SavedObjectsClientContract
  ) {
    this.context = context;
    this.server = server;
    this.soClient = soClient;
  }

  async setupDefaultAlerts(connectors?: MonitorConnectors[]) {
    const [statusRule, tlsRule] = await Promise.allSettled([
      this.setupStatusRule(connectors),
      this.setupTlsRule(connectors),
    ]);

    if (statusRule.status === 'rejected') {
      throw statusRule.reason;
    }
    if (tlsRule.status === 'rejected') {
      throw tlsRule.reason;
    }

    return {
      statusRule: statusRule.status === 'fulfilled' ? statusRule.value : null,
      tlsRule: tlsRule.status === 'fulfilled' ? tlsRule.value : null,
    };
  }

  setupStatusRule(connectors?: MonitorConnectors[]) {
    return this.createDefaultAlertIfNotExist(
      SYNTHETICS_STATUS_RULE,
      `Synthetics status internal alert`,
      '1m',
      connectors
    );
  }

  setupTlsRule(connectors?: MonitorConnectors[]) {
    return this.createDefaultAlertIfNotExist(
      SYNTHETICS_TLS_RULE,
      `Synthetics internal TLS alert`,
      '1m',
      connectors
    );
  }

  async getExistingAlert(ruleType: DefaultRuleType) {
    const rulesClient = (await this.context.alerting)?.getRulesClient();

    const { data } = await rulesClient.find({
      options: {
        page: 1,
        perPage: 1,
        filter: `alert.attributes.alertTypeId:(${ruleType})`,
      },
    });

    const alert = data?.[0];
    if (!alert) {
      return;
    }

    return { ...alert, ruleTypeId: alert.alertTypeId };
  }

  async createDefaultAlertIfNotExist(
    ruleType: DefaultRuleType,
    name: string,
    interval: string,
    monitorConnectors?: MonitorConnectors[]
  ) {
    const alert = await this.getExistingAlert(ruleType);

    if (alert) {
      if (!monitorConnectors) {
        return alert;
      } else {
        const existingActions = alert.actions;
        const actions = await this.getAlertActions({
          ruleType,
          monitorConnectors,
          existingActions,
        });
        const rulesClient = (await this.context.alerting)?.getRulesClient();
        const updatedAlert = await rulesClient.update({
          id: alert.id,
          data: {
            actions,
            name: alert.name,
            tags: alert.tags,
            schedule: alert.schedule,
            params: alert.params,
          },
        });
        return { ...updatedAlert, ruleTypeId: updatedAlert.alertTypeId };
      }
    }

    const customMonitorConnectors = await this.getCustomActions();

    const rulesClient = (await this.context.alerting)?.getRulesClient();
    const actions = await this.getAlertActions({
      ruleType,
      monitorConnectors: customMonitorConnectors,
    });

    const newAlert = await rulesClient.create<{}>({
      data: {
        actions,
        params: {},
        consumer: 'uptime',
        alertTypeId: ruleType,
        schedule: { interval },
        tags: ['SYNTHETICS_DEFAULT_ALERT'],
        name,
        enabled: true,
        throttle: null,
      },
    });
    return { ...newAlert, ruleTypeId: newAlert.alertTypeId };
  }

  async getCustomActions() {
    const allMonitors = await getAllMonitors({
      soClient: this.soClient,
      filter: `${monitorAttributes}.${AlertConfigKey.HAS_CONNECTORS}: true`,
    });

    const monitorConnectors: MonitorConnectors[] = [];
    allMonitors.forEach((monitor) => {
      const connectors = monitor.attributes.alert?.connectors ?? [];
      const configId = monitor.attributes?.[ConfigKey.CONFIG_ID];
      if (connectors.length > 0) {
        monitorConnectors.push({
          configId,
          addedConnectors: connectors,
        });
      }
    });
    return monitorConnectors;
  }

  updateStatusRule() {
    return this.updateDefaultAlert(
      SYNTHETICS_STATUS_RULE,
      `Synthetics status internal alert`,
      '1m'
    );
  }
  updateTlsRule() {
    return this.updateDefaultAlert(SYNTHETICS_TLS_RULE, `Synthetics internal TLS alert`, '1m');
  }

  async updateDefaultAlert(ruleType: DefaultRuleType, name: string, interval: string) {
    const rulesClient = (await this.context.alerting)?.getRulesClient();

    const alert = await this.getExistingAlert(ruleType);
    if (alert) {
      const actions = await this.getAlertActions({ ruleType, existingActions: alert.actions });
      const updatedAlert = await rulesClient.update({
        id: alert.id,
        data: {
          actions,
          name: alert.name,
          tags: alert.tags,
          schedule: alert.schedule,
          params: alert.params,
        },
      });
      return { ...updatedAlert, ruleTypeId: updatedAlert.alertTypeId };
    }

    return await this.createDefaultAlertIfNotExist(ruleType, name, interval);
  }

  async getAlertActions({
    ruleType,
    monitorConnectors,
    existingActions,
  }: {
    ruleType: DefaultRuleType;
    monitorConnectors?: MonitorConnectors[];
    existingActions?: RuleAction[];
  }): Promise<RuleAction[]> {
    const [settings, allActionConnectors] = await Promise.all([
      savedObjectsAdapter.getUptimeDynamicSettings(this.soClient),
      this.getActionConnectors(),
    ]);

    if (ruleType === SYNTHETICS_STATUS_RULE) {
      return populateAlertActions({
        settings,
        allActionConnectors,
        monitorConnectors,
        groupId: ACTION_GROUP_DEFINITIONS.MONITOR_STATUS.id,
        translations: StatusTranslations,
        existingActions,
      });
    } else {
      return populateAlertActions({
        settings,
        monitorConnectors,
        allActionConnectors,
        groupId: ACTION_GROUP_DEFINITIONS.TLS_CERTIFICATE.id,
        translations: CertTranslations,
        existingActions,
      });
    }
  }

  async getActionConnectors() {
    const actionsClient = (await this.context.actions)?.getActionsClient();

    let actionConnectors: FindActionResult[] = [];
    try {
      actionConnectors = await actionsClient.getAll();
    } catch (e) {
      this.server.logger.error(e);
    }
    return actionConnectors;
  }
}

const StatusTranslations = {
  defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
  defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
  defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
  defaultRecoverySubjectMessage: SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
};

const CertTranslations = {
  defaultActionMessage: TlsTranslations.defaultActionMessage,
  defaultRecoveryMessage: TlsTranslations.defaultRecoveryMessage,
  defaultSubjectMessage: TlsTranslations.defaultSubjectMessage,
  defaultRecoverySubjectMessage: TlsTranslations.defaultRecoverySubjectMessage,
};
