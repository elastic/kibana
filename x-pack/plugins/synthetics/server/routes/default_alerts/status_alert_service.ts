/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { savedObjectsAdapter } from '../../legacy_uptime/lib/saved_objects';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { populateAlertActions } from '../../../common/rules/alert_actions';
import { SyntheticsMonitorStatusTranslations } from '../../../common/rules/synthetics/translations';
import { UptimeRequestHandlerContext } from '../../types';
import {
  ACTION_GROUP_DEFINITIONS,
  SYNTHETICS_ALERT_RULE_TYPES,
} from '../../../common/constants/synthetics_alerts';

export class StatusAlertService {
  context: UptimeRequestHandlerContext;
  soClient: SavedObjectsClientContract;
  server: UptimeServerSetup;

  constructor(
    context: UptimeRequestHandlerContext,
    server: UptimeServerSetup,
    soClient: SavedObjectsClientContract
  ) {
    this.context = context;
    this.server = server;
    this.soClient = soClient;
  }

  async getExistingAlert() {
    const rulesClient = (await this.context.alerting)?.getRulesClient();

    const { data } = await rulesClient.find({
      options: {
        page: 1,
        perPage: 1,
        filter: `alert.attributes.alertTypeId:(${SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS})`,
      },
    });

    const alert = data?.[0];
    if (!alert) {
      return;
    }

    return { ...alert, ruleTypeId: alert.alertTypeId };
  }
  async createDefaultAlertIfNotExist() {
    const alert = await this.getExistingAlert();
    if (alert) {
      return alert;
    }

    const actions = await this.getAlertActions();

    const rulesClient = (await this.context.alerting)?.getRulesClient();
    const newAlert = await rulesClient.create<{}>({
      data: {
        actions,
        params: {},
        consumer: 'uptime',
        alertTypeId: SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS,
        schedule: { interval: '1m' },
        notifyWhen: 'onActionGroupChange',
        tags: ['SYNTHETICS_DEFAULT_ALERT'],
        name: `Synthetics internal alert`,
        enabled: true,
        throttle: null,
      },
    });
    return { ...newAlert, ruleTypeId: newAlert.alertTypeId };
  }

  async updateDefaultAlert() {
    const rulesClient = (await this.context.alerting)?.getRulesClient();

    const alert = await this.getExistingAlert();
    if (alert) {
      const actions = await this.getAlertActions();
      const updatedAlert = await rulesClient.update({
        id: alert.id,
        data: {
          actions,
          name: alert.name,
          tags: alert.tags,
          schedule: alert.schedule,
          params: alert.params,
          notifyWhen: alert.notifyWhen,
        },
      });
      return { ...updatedAlert, ruleTypeId: updatedAlert.alertTypeId };
    }

    return await this.createDefaultAlertIfNotExist();
  }

  async getAlertActions() {
    const { actionConnectors, settings } = await this.getActionConnectors();

    const defaultActions = (actionConnectors ?? []).filter((act) =>
      settings?.defaultConnectors?.includes(act.id)
    );

    return populateAlertActions({
      groupId: ACTION_GROUP_DEFINITIONS.MONITOR_STATUS.id,
      defaultActions,
      defaultEmail: settings?.defaultEmail!,
      translations: {
        defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
      },
    });
  }

  async getActionConnectors() {
    const actionsClient = (await this.context.actions)?.getActionsClient();

    const settings = await savedObjectsAdapter.getUptimeDynamicSettings(this.soClient);
    let actionConnectors: FindActionResult[] = [];
    try {
      actionConnectors = await actionsClient.getAll();
    } catch (e) {
      this.server.logger.error(e);
    }
    return { actionConnectors, settings };
  }
}
