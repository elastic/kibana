/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreStart,
  CoreSetup,
  PluginInitializerContext,
  Plugin as CorePlugin,
} from 'src/core/public';

import { i18n } from '@kbn/i18n';
import { registerBuiltInActionTypes } from './application/components/builtin_action_types';
import { registerBuiltInAlertTypes } from './application/components/builtin_alert_types';
import { ActionTypeModel, AlertTypeModel } from './types';
import { TypeRegistry } from './application/type_registry';
import { ManagementSetup, ManagementSectionId } from '../../../../src/plugins/management/public';
import { boot } from './application/boot';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';
import { PluginStartContract as AlertingStart } from '../../alerts/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';

export interface TriggersAndActionsUIPublicPluginSetup {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
}

export interface TriggersAndActionsUIPublicPluginStart {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
}

interface PluginsSetup {
  management: ManagementSetup;
}

interface PluginsStart {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  alerts?: AlertingStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
}

export class Plugin
  implements
    CorePlugin<
      TriggersAndActionsUIPublicPluginSetup,
      TriggersAndActionsUIPublicPluginStart,
      PluginsSetup,
      PluginsStart
    > {
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  private alertTypeRegistry: TypeRegistry<AlertTypeModel>;

  constructor(initializerContext: PluginInitializerContext) {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.actionTypeRegistry = actionTypeRegistry;

    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    this.alertTypeRegistry = alertTypeRegistry;
  }

  public setup(
    core: CoreSetup<PluginsStart>,
    plugins: PluginsSetup
  ): TriggersAndActionsUIPublicPluginSetup {
    registerBuiltInActionTypes({
      actionTypeRegistry: this.actionTypeRegistry,
    });

    registerBuiltInAlertTypes({
      alertTypeRegistry: this.alertTypeRegistry,
    });

    plugins.management.sections.getSection(ManagementSectionId.InsightsAndAlerting).registerApp({
      id: 'triggersActions',
      title: i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
        defaultMessage: 'Alerts and Actions',
      }),
      order: 0,
      mount: async (params) => {
        const [coreStart, startPlugins] = await core.getStartServices();
        boot({
          dataPlugin: startPlugins.data,
          charts: startPlugins.charts,
          alerts: startPlugins.alerts,
          element: params.element,
          toastNotifications: core.notifications.toasts,
          http: core.http,
          uiSettings: core.uiSettings,
          docLinks: coreStart.docLinks,
          chrome: coreStart.chrome,
          savedObjects: coreStart.savedObjects.client,
          I18nContext: coreStart.i18n.Context,
          capabilities: coreStart.application.capabilities,
          navigateToApp: coreStart.application.navigateToApp,
          setBreadcrumbs: params.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry: this.actionTypeRegistry,
          alertTypeRegistry: this.alertTypeRegistry,
        });
        return () => {};
      },
    });

    return {
      actionTypeRegistry: this.actionTypeRegistry,
      alertTypeRegistry: this.alertTypeRegistry,
    };
  }

  public start(): TriggersAndActionsUIPublicPluginStart {
    return {
      actionTypeRegistry: this.actionTypeRegistry,
      alertTypeRegistry: this.alertTypeRegistry,
    };
  }

  public stop() {}
}
