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
  /**
   * Register a customized view of the particular rule type. Stack Management provides a generic overview, but a developer can register a
   * custom navigation to provide the user an extra link to a more curated view. The alerting plugin doesn't actually do
   * anything with this information, but it can be used by other plugins via the `getNavigation` functionality. Currently
   * the trigger_actions_ui plugin uses it to expose the link from the generic rule details view in Stack Management.
   *
   * @param applicationId The application id that the user should be navigated to, to view a particular alert in a custom way.
   * @param ruleType The rule type that has been registered with Alerting.Server.PluginSetupContract.registerType. If
   * no such rule with that id exists, a warning is output to the console log. It used to throw an error, but that was temporarily moved
   * because it was causing flaky test failures with https://github.com/elastic/kibana/issues/59229 and needs to be
   * investigated more.
   * @param handler The navigation handler should return either a relative URL, or a state object. This information can be used,
   * in conjunction with the consumer id, to navigate the user to a custom URL to view a rule's details.
   * @throws an error if the given applicationId and ruleType combination has already been registered.
   */
  registerNavigation: (
    applicationId: string,
    ruleType: string,
    handler: AlertNavigationHandler
  ) => void;

  /**
   * Register a customized view for all rule types with this application id. Stack Management provides a generic overview, but a developer can register a
   * custom navigation to provide the user an extra link to a more curated view. The alerting plugin doesn't actually do
   * anything with this information, but it can be used by other plugins via the `getNavigation` functionality. Currently
   * the trigger_actions_ui plugin uses it to expose the link from the generic rule details view in Stack Management.
   *
   * @param applicationId The application id that the user should be navigated to, to view a particular alert in a custom way.
   * @param handler The navigation handler should return either a relative URL, or a state object. This information can be used,
   * in conjunction with the consumer id, to navigate the user to a custom URL to view a rule's details.
   */
  registerDefaultNavigation: (applicationId: string, handler: AlertNavigationHandler) => void;
}
export interface PluginStartContract {
  getNavigation: (alertId: Alert['id']) => Promise<AlertNavigation | undefined>;
}

export class AlertingPublicPlugin implements Plugin<PluginSetupContract, PluginStartContract> {
  private alertNavigationRegistry?: AlertNavigationRegistry;
  public setup(core: CoreSetup) {
    this.alertNavigationRegistry = new AlertNavigationRegistry();

    const registerNavigation = async (
      applicationId: string,
      ruleTypeId: string,
      handler: AlertNavigationHandler
    ) => {
      const alertType = await loadAlertType({ http: core.http, id: ruleTypeId });
      if (!alertType) {
        // eslint-disable-next-line no-console
        console.log(
          `Unable to register navigation for rule type "${ruleTypeId}" because it is not registered on the server side.`
        );
        return;
      }
      this.alertNavigationRegistry!.register(applicationId, alertType, handler);
    };

    const registerDefaultNavigation = async (
      applicationId: string,
      handler: AlertNavigationHandler
    ) => this.alertNavigationRegistry!.registerDefault(applicationId, handler);

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
          const state = navigationHandler(alert);
          return typeof state === 'string' ? { path: state } : { state };
        }
      },
    };
  }
}
