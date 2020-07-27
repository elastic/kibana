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
import { hasShowActionsCapability, hasShowAlertsCapability } from './application/lib/capabilities';
import { ActionTypeModel, AlertTypeModel } from './types';
import { TypeRegistry } from './application/type_registry';
import {
  ManagementSetup,
  ManagementAppMountParams,
  ManagementApp,
} from '../../../../src/plugins/management/public';
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
    CorePlugin<TriggersAndActionsUIPublicPluginSetup, TriggersAndActionsUIPublicPluginStart> {
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  private alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  private managementApp?: ManagementApp;

  constructor(initializerContext: PluginInitializerContext) {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.actionTypeRegistry = actionTypeRegistry;

    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    this.alertTypeRegistry = alertTypeRegistry;
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): TriggersAndActionsUIPublicPluginSetup {
    const actionTypeRegistry = this.actionTypeRegistry;
    const alertTypeRegistry = this.alertTypeRegistry;

    this.managementApp = plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: 'triggersActions',
      title: i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
        defaultMessage: 'Alerts and Actions',
      }),
      order: 0,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          PluginsStart,
          unknown
        ];
        boot({
          dataPlugin: pluginsStart.data,
          charts: pluginsStart.charts,
          alerts: pluginsStart.alerts,
          element: params.element,
          toastNotifications: coreStart.notifications.toasts,
          http: coreStart.http,
          uiSettings: coreStart.uiSettings,
          docLinks: coreStart.docLinks,
          chrome: coreStart.chrome,
          savedObjects: coreStart.savedObjects.client,
          I18nContext: coreStart.i18n.Context,
          capabilities: coreStart.application.capabilities,
          navigateToApp: coreStart.application.navigateToApp,
          setBreadcrumbs: params.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry,
          alertTypeRegistry,
        });
        return () => {};
      },
    });

    registerBuiltInActionTypes({
      actionTypeRegistry: this.actionTypeRegistry,
    });

    registerBuiltInAlertTypes({
      alertTypeRegistry: this.alertTypeRegistry,
    });

    return {
      actionTypeRegistry: this.actionTypeRegistry,
      alertTypeRegistry: this.alertTypeRegistry,
    };
  }

  public start(core: CoreStart): TriggersAndActionsUIPublicPluginStart {
    const { capabilities } = core.application;

    const canShowActions = hasShowActionsCapability(capabilities);
    const canShowAlerts = hasShowAlertsCapability(capabilities);
    const managementApp = this.managementApp as ManagementApp;

    // Don't register routes when user doesn't have access to the application
    if (canShowActions || canShowAlerts) {
      managementApp.enable();
    } else {
      managementApp.disable();
    }
    return {
      actionTypeRegistry: this.actionTypeRegistry,
      alertTypeRegistry: this.alertTypeRegistry,
    };
  }

  public stop() {}
}
