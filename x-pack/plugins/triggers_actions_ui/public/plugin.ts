/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, PluginInitializerContext, Plugin as CorePlugin } from 'src/core/public';

import { i18n } from '@kbn/i18n';
import { registerBuiltInActionTypes } from './application/components/builtin_action_types';
import { registerBuiltInAlertTypes } from './application/components/builtin_alert_types';
import { hasShowActionsCapability, hasShowAlertsCapability } from './application/lib/capabilities';
import { ActionTypeModel, AlertTypeModel } from './types';
import { TypeRegistry } from './application/type_registry';
import { ManagementStart } from '../../../../src/plugins/management/public';
import { boot } from './application/boot';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';

export interface TriggersAndActionsUIPublicPluginSetup {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
}

export type Start = void;

interface PluginsStart {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  management: ManagementStart;
}

export class Plugin implements CorePlugin<TriggersAndActionsUIPublicPluginSetup, Start> {
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  private alertTypeRegistry: TypeRegistry<AlertTypeModel>;

  constructor(initializerContext: PluginInitializerContext) {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.actionTypeRegistry = actionTypeRegistry;

    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    this.alertTypeRegistry = alertTypeRegistry;
  }

  public setup(): TriggersAndActionsUIPublicPluginSetup {
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

  public start(core: CoreStart, plugins: PluginsStart) {
    const { capabilities } = core.application;

    const canShowActions = hasShowActionsCapability(capabilities);
    const canShowAlerts = hasShowAlertsCapability(capabilities);

    // Don't register routes when user doesn't have access to the application
    if (!canShowActions && !canShowAlerts) {
      return;
    }

    plugins.management.sections.getSection('kibana')!.registerApp({
      id: 'triggersActions',
      title: i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
        defaultMessage: 'Alerts and Actions',
      }),
      order: 7,
      mount: params => {
        boot({
          dataPlugin: plugins.data,
          charts: plugins.charts,
          element: params.element,
          toastNotifications: core.notifications.toasts,
          injectedMetadata: core.injectedMetadata,
          http: core.http,
          uiSettings: core.uiSettings,
          docLinks: core.docLinks,
          chrome: core.chrome,
          savedObjects: core.savedObjects.client,
          I18nContext: core.i18n.Context,
          capabilities: core.application.capabilities,
          setBreadcrumbs: params.setBreadcrumbs,
          actionTypeRegistry: this.actionTypeRegistry,
          alertTypeRegistry: this.alertTypeRegistry,
        });
        return () => {};
      },
    });
  }

  public stop() {}
}
