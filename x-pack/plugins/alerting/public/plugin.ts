/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ManagementAppMountParams, ManagementSetup } from '@kbn/management-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import { AlertNavigationRegistry, AlertNavigationHandler } from './alert_navigation_registry';
import { loadRule, loadRuleType } from './services/rule_api';
import { ENABLE_MAINTENANCE_WINDOWS, Rule, MAINTENANCE_WINDOWS_APP_ID } from '../common';

export interface PluginSetupContract {
  /**
   * Register a customized view of the particular rule type. Stack Management provides a generic overview, but a developer can register a
   * custom navigation to provide the user an extra link to a more curated view. The alerting plugin doesn't actually do
   * anything with this information, but it can be used by other plugins via the `getNavigation` functionality. Currently
   * the trigger_actions_ui plugin uses it to expose the link from the generic rule details view in Stack Management.
   *
   * @param applicationId The application id that the user should be navigated to, to view a particular rule in a custom way.
   * @param ruleType The rule type that has been registered with Alerting.Server.PluginSetupContract.registerType. If
   * no such rule with that id exists, a warning is output to the console log. It used to throw an error, but that was temporarily moved
   * because it was causing flaky test failures with https://github.com/elastic/kibana/issues/59229 and needs to be
   * investigated more.
   * @param handler The navigation handler should return either a relative URL, or a state object. This information can be used,
   * in conjunction with the consumer id, to navigate the user to a custom URL to view a rule's details.
   * @throws an error if the given applicationId and ruleType combination has already been registered.
   *
   * @deprecated use "getViewInAppRelativeUrl" on the server side rule type instead.
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
   * @param applicationId The application id that the user should be navigated to, to view a particular rule in a custom way.
   * @param handler The navigation handler should return either a relative URL, or a state object. This information can be used,
   * in conjunction with the consumer id, to navigate the user to a custom URL to view a rule's details.
   *
   * @deprecated use "getViewInAppRelativeUrl" on the server side rule type instead.
   */
  registerDefaultNavigation: (applicationId: string, handler: AlertNavigationHandler) => void;
}
export interface PluginStartContract {
  getNavigation: (ruleId: Rule['id']) => Promise<string | undefined>;
  getMaxAlertsPerRun: () => number;
}
export interface AlertingPluginSetup {
  management: ManagementSetup;
}

export interface AlertingPluginStart {
  licensing: LicensingPluginStart;
  spaces: SpacesPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
}

export interface AlertingUIConfig {
  rules: {
    run: {
      alerts: {
        max: number;
      };
    };
  };
}

export class AlertingPublicPlugin
  implements
    Plugin<PluginSetupContract, PluginStartContract, AlertingPluginSetup, AlertingPluginStart>
{
  private alertNavigationRegistry?: AlertNavigationRegistry;
  private config: AlertingUIConfig;
  readonly maxAlertsPerRun: number;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.config = this.initContext.config.get<AlertingUIConfig>();
    this.maxAlertsPerRun = this.config.rules.run.alerts.max;
  }

  public setup(core: CoreSetup, plugins: AlertingPluginSetup) {
    this.alertNavigationRegistry = new AlertNavigationRegistry();

    const kibanaVersion = this.initContext.env.packageInfo.version;

    const registerNavigation = async (
      applicationId: string,
      ruleTypeId: string,
      handler: AlertNavigationHandler
    ) => {
      this.alertNavigationRegistry!.register(applicationId, ruleTypeId, handler);
    };

    const registerDefaultNavigation = async (
      applicationId: string,
      handler: AlertNavigationHandler
    ) => this.alertNavigationRegistry!.registerDefault(applicationId, handler);

    if (ENABLE_MAINTENANCE_WINDOWS) {
      plugins.management.sections.section.insightsAndAlerting.registerApp({
        id: MAINTENANCE_WINDOWS_APP_ID,
        title: i18n.translate('xpack.alerting.management.section.title', {
          defaultMessage: 'Maintenance Windows',
        }),
        async mount(params: ManagementAppMountParams) {
          const { renderApp } = await import('./application/maintenance_windows');

          const [coreStart, pluginsStart] = (await core.getStartServices()) as [
            CoreStart,
            AlertingPluginStart,
            unknown
          ];

          return renderApp({
            core: coreStart,
            plugins: pluginsStart,
            mountParams: params,
            kibanaVersion,
          });
        },
      });
    }

    return {
      registerNavigation,
      registerDefaultNavigation,
    };
  }

  public start(core: CoreStart) {
    return {
      getNavigation: async (ruleId: Rule['id']) => {
        const rule = await loadRule({ http: core.http, ruleId });
        const ruleType = await loadRuleType({ http: core.http, id: rule.alertTypeId });

        if (!ruleType) {
          // eslint-disable-next-line no-console
          console.log(
            `Unable to get navigation for rule type "${rule.alertTypeId}" because it is not registered on the server side.`
          );
          return;
        }

        if (this.alertNavigationRegistry!.has(rule.consumer, ruleType)) {
          const navigationHandler = this.alertNavigationRegistry!.get(rule.consumer, ruleType);
          const navUrl = navigationHandler(rule);
          if (navUrl) return navUrl;
        }

        if (rule.viewInAppRelativeUrl) {
          return rule.viewInAppRelativeUrl;
        }
      },
      getMaxAlertsPerRun: () => {
        return this.maxAlertsPerRun;
      },
    };
  }
}
