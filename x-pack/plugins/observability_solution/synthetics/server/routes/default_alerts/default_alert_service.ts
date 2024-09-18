/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { parseDuration } from '@kbn/alerting-plugin/server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { savedObjectsAdapter } from '../../saved_objects';
import { populateAlertActions } from '../../../common/rules/alert_actions';
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
import { DefaultRuleType } from '../../../common/types/default_alerts';
export class DefaultAlertService {
  context: UptimeRequestHandlerContext;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  settings?: DynamicSettingsAttributes;

  constructor(
    context: UptimeRequestHandlerContext,
    server: SyntheticsServerSetup,
    soClient: SavedObjectsClientContract
  ) {
    this.context = context;
    this.server = server;
    this.soClient = soClient;
  }

  async getSettings() {
    if (!this.settings) {
      this.settings = await savedObjectsAdapter.getSyntheticsDynamicSettings(this.soClient);
    }
    return this.settings;
  }

  async setupDefaultAlerts() {
    this.settings = await this.getSettings();

    const [statusRule, tlsRule] = await Promise.allSettled([
      this.setupStatusRule(),
      this.setupTlsRule(),
    ]);

    if (statusRule.status === 'rejected') {
      throw statusRule.reason;
    }
    if (tlsRule.status === 'rejected') {
      throw tlsRule.reason;
    }

    return {
      statusRule: statusRule.status === 'fulfilled' && statusRule.value ? statusRule.value : null,
      tlsRule: tlsRule.status === 'fulfilled' && tlsRule.value ? tlsRule.value : null,
    };
  }

  getMinimumRuleInterval() {
    const minimumInterval = this.server.alerting.getConfig().minimumScheduleInterval;
    const minimumIntervalInMs = parseDuration(minimumInterval.value);
    const defaultIntervalInMs = parseDuration('1m');
    const interval = minimumIntervalInMs < defaultIntervalInMs ? '1m' : minimumInterval.value;
    return interval;
  }

  setupStatusRule() {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultStatusRuleEnabled === false) {
      return;
    }
    return this.createDefaultAlertIfNotExist(
      SYNTHETICS_STATUS_RULE,
      `Synthetics status internal rule`,
      minimumRuleInterval
    );
  }

  setupTlsRule() {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultTLSRuleEnabled === false) {
      return;
    }
    return this.createDefaultAlertIfNotExist(
      SYNTHETICS_TLS_RULE,
      `Synthetics internal TLS rule`,
      minimumRuleInterval
    );
  }

  async getExistingAlert(ruleType: DefaultRuleType) {
    const rulesClient = await (await this.context.alerting)?.getRulesClient();

    const { data } = await rulesClient.find({
      options: {
        page: 1,
        perPage: 1,
        filter: `alert.attributes.alertTypeId:(${ruleType}) AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      },
    });

    if (data.length === 0) {
      return;
    }
    const { actions = [], systemActions = [], ...alert } = data[0];
    return { ...alert, actions: [...actions, ...systemActions], ruleTypeId: alert.alertTypeId };
  }

  async createDefaultAlertIfNotExist(ruleType: DefaultRuleType, name: string, interval: string) {
    const alert = await this.getExistingAlert(ruleType);
    if (alert) {
      return alert;
    }

    const actions = await this.getAlertActions(ruleType);
    const rulesClient = await (await this.context.alerting)?.getRulesClient();
    const {
      actions: actionsFromRules = [],
      systemActions = [],
      ...newAlert
    } = await rulesClient.create<{}>({
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

    return {
      ...newAlert,
      actions: [...actionsFromRules, ...systemActions],
      ruleTypeId: newAlert.alertTypeId,
    };
  }

  async updateStatusRule(enabled?: boolean) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (enabled) {
      return this.updateDefaultAlert(
        SYNTHETICS_STATUS_RULE,
        `Synthetics status internal rule`,
        minimumRuleInterval
      );
    } else {
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      await rulesClient.bulkDeleteRules({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_STATUS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
    }
  }

  async updateTlsRule(enabled?: boolean) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (enabled) {
      return this.updateDefaultAlert(
        SYNTHETICS_TLS_RULE,
        `Synthetics internal TLS rule`,
        minimumRuleInterval
      );
    } else {
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      await rulesClient.bulkDeleteRules({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_TLS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
    }
  }

  async updateDefaultAlert(ruleType: DefaultRuleType, name: string, interval: string) {
    const rulesClient = await (await this.context.alerting)?.getRulesClient();

    const alert = await this.getExistingAlert(ruleType);
    if (alert) {
      const currentIntervalInMs = parseDuration(alert.schedule.interval);
      const minimumIntervalInMs = parseDuration(interval);
      const actions = await this.getAlertActions(ruleType);
      const {
        actions: actionsFromRules = [],
        systemActions = [],
        ...updatedAlert
      } = await rulesClient.update({
        id: alert.id,
        data: {
          actions,
          name: alert.name,
          tags: alert.tags,
          schedule: {
            interval:
              currentIntervalInMs < minimumIntervalInMs ? interval : alert.schedule.interval,
          },
          params: alert.params,
        },
      });
      return {
        ...updatedAlert,
        actions: [...actionsFromRules, ...systemActions],
        ruleTypeId: updatedAlert.alertTypeId,
      };
    }

    return await this.createDefaultAlertIfNotExist(ruleType, name, interval);
  }

  async getAlertActions(ruleType: DefaultRuleType) {
    const { actionConnectors, settings } = await this.getActionConnectors();

    const defaultActions = (actionConnectors ?? []).filter((act) =>
      settings?.defaultConnectors?.includes(act.id)
    );

    if (ruleType === SYNTHETICS_STATUS_RULE) {
      return populateAlertActions({
        defaultActions,
        groupId: ACTION_GROUP_DEFINITIONS.MONITOR_STATUS.id,
        defaultEmail: settings?.defaultEmail!,
        translations: {
          defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
          defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
          defaultRecoverySubjectMessage:
            SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
        },
      });
    } else {
      return populateAlertActions({
        defaultActions,
        groupId: ACTION_GROUP_DEFINITIONS.TLS_CERTIFICATE.id,
        defaultEmail: settings?.defaultEmail!,
        translations: {
          defaultActionMessage: TlsTranslations.defaultActionMessage,
          defaultRecoveryMessage: TlsTranslations.defaultRecoveryMessage,
          defaultSubjectMessage: TlsTranslations.defaultSubjectMessage,
          defaultRecoverySubjectMessage: TlsTranslations.defaultRecoverySubjectMessage,
        },
      });
    }
  }

  async getActionConnectors() {
    const actionsClient = (await this.context.actions)?.getActionsClient();
    if (!this.settings) {
      this.settings = await savedObjectsAdapter.getSyntheticsDynamicSettings(this.soClient);
    }
    let actionConnectors: FindActionResult[] = [];
    try {
      actionConnectors = await actionsClient.getAll();
    } catch (e) {
      this.server.logger.error(e);
    }
    return { actionConnectors, settings: this.settings };
  }
}
