/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, CoreStart } from 'src/core/public';

import { AlertNavigationRegistry, AlertNavigationHandler } from './alert_navigation_registry';
import { loadAlert, loadAlertType } from './alert_api';
import { Alert, AlertNavigation } from '../common';

export interface PluginSetupContract {
  registerNavigation: (
    consumer: string,
    alertType: string,
    handler: AlertNavigationHandler
  ) => void;
  registerDefaultNavigation: (consumer: string, handler: AlertNavigationHandler) => void;
}
export interface PluginStartContract {
  getNavigation: (alertId: Alert['id']) => Promise<AlertNavigation | undefined>;
}

export class AlertingPublicPlugin implements Plugin<PluginSetupContract, PluginStartContract> {
  private alertNavigationRegistry?: AlertNavigationRegistry;
  public setup(core: CoreSetup) {
    this.alertNavigationRegistry = new AlertNavigationRegistry();

    const registerNavigation = async (
      consumer: string,
      alertType: string,
      handler: AlertNavigationHandler
    ) =>
      this.alertNavigationRegistry!.register(
        consumer,
        await loadAlertType({ http: core.http, id: alertType }),
        handler
      );

    const registerDefaultNavigation = async (consumer: string, handler: AlertNavigationHandler) =>
      this.alertNavigationRegistry!.registerDefault(consumer, handler);

    return {
      registerNavigation,
      registerDefaultNavigation,
    };
  }

  public start(core: CoreStart) {
    return {
      getNavigation: async (alertId: Alert['id']) => {
        const alert = await loadAlert({ http: core.http, alertId });
        const alertType = await loadAlertType({ http: core.http, id: alert.alertTypeId });

        if (this.alertNavigationRegistry!.has(alert.consumer, alertType)) {
          const navigationHandler = this.alertNavigationRegistry!.get(alert.consumer, alertType);
          const state = navigationHandler(alert, alertType);
          return typeof state === 'string' ? { path: state } : { state };
        }
      },
    };
  }
}
