/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { TLSParams } from '../../../common/runtime_types/alerts/tls';
import { savedObjectsAdapter } from '../../legacy_uptime/lib/saved_objects';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { populateAlertActions } from '../../../common/rules/alert_actions';
import { TlsTranslations } from '../../../common/rules/synthetics/translations';
import { UptimeRequestHandlerContext } from '../../types';
import {
  ACTION_GROUP_DEFINITIONS,
  SYNTHETICS_ALERT_RULE_TYPES,
} from '../../../common/constants/synthetics_alerts';

// uuid based on the string 'uptime-tls-default-alert'
const TLS_DEFAULT_ALERT_ID = '7a532181-ff1d-4317-9367-7ca789133920';

export class TLSAlertService {
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
    try {
      const alert = await rulesClient.get({ id: TLS_DEFAULT_ALERT_ID });
      return { ...alert, ruleTypeId: alert.alertTypeId };
    } catch (e) {
      return null;
    }
  }
  async createDefaultAlertIfNotExist() {
    const alert = await this.getExistingAlert();
    if (alert) {
      return alert;
    }

    const actions = await this.getAlertActions();

    const rulesClient = (await this.context.alerting)?.getRulesClient();
    const newAlert = await rulesClient.create<TLSParams>({
      data: {
        actions,
        params: {},
        consumer: 'uptime',
        alertTypeId: SYNTHETICS_ALERT_RULE_TYPES.TLS,
        schedule: { interval: '1m' },
        tags: ['SYNTHETICS_TLS_DEFAULT_ALERT'],
        name: `Synthetics internal TLS alert`,
        enabled: true,
        throttle: null,
      },
      options: {
        id: TLS_DEFAULT_ALERT_ID,
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
      groupId: ACTION_GROUP_DEFINITIONS.TLS_CERTIFICATE.id,
      defaultActions,
      defaultEmail: settings?.defaultEmail!,
      translations: {
        defaultActionMessage: TlsTranslations.defaultActionMessage,
        defaultRecoveryMessage: TlsTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: TlsTranslations.defaultSubjectMessage,
        defaultRecoverySubjectMessage: TlsTranslations.defaultRecoverySubjectMessage,
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
