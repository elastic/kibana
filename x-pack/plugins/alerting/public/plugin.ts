/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      alertTypeId: string,
      handler: AlertNavigationHandler
    ) => {
      const alertType = await loadAlertType({ http: core.http, id: alertTypeId });
      if (!alertType) {
        // eslint-disable-next-line no-console
        console.log(
          `Unable to register navigation for alert type "${alertTypeId}" because it is not registered on the server side.`
        );
        return;
      }
      this.alertNavigationRegistry!.register(consumer, alertType, handler);
    };

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

        if (!alertType) {
          // eslint-disable-next-line no-console
          console.log(
            `Unable to get navigation for alert type "${alert.alertTypeId}" because it is not registered on the server side.`
          );
          return;
        }

        if (this.alertNavigationRegistry!.has(alert.consumer, alertType)) {
          const navigationHandler = this.alertNavigationRegistry!.get(alert.consumer, alertType);
          const state = navigationHandler(alert, alertType);
          return typeof state === 'string' ? { path: state } : { state };
        }
      },
    };
  }
}
