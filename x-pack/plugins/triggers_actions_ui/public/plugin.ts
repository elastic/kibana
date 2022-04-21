/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin as CorePlugin } from '@kbn/core/public';

import { i18n } from '@kbn/i18n';
import { ReactElement } from 'react';
import { PluginInitializerContext } from '@kbn/core/public';
import { FeaturesPluginStart } from '@kbn/features-plugin/public';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { ManagementAppMountParams, ManagementSetup } from '@kbn/management-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { registerBuiltInActionTypes } from './application/components/builtin_action_types';
import { TypeRegistry } from './application/type_registry';

import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';
import { getAddAlertFlyoutLazy } from './common/get_add_alert_flyout';
import { getEditAlertFlyoutLazy } from './common/get_edit_alert_flyout';
import { getAlertsTableLazy } from './common/get_alerts_table';
import { getRuleStatusDropdownLazy } from './common/get_rule_status_dropdown';
import { ExperimentalFeaturesService } from './common/experimental_features_service';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';

import type {
  ActionTypeModel,
  RuleAddProps,
  RuleEditProps,
  RuleTypeModel,
  ConnectorAddFlyoutProps,
  ConnectorEditFlyoutProps,
  AlertsTableProps,
  RuleStatusDropdownProps,
  AlertsTableConfigurationRegistry,
} from './types';
import { TriggersActionsUiConfigType } from '../common/types';
import { registerAlertsTableConfiguration } from './application/sections/alerts_table/alerts_page/register_alerts_table_configuration';
import { PLUGIN_ID } from './common/constants';

export interface TriggersAndActionsUIPublicPluginSetup {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
  alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry>;
}

export interface TriggersAndActionsUIPublicPluginStart {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
  alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry>;
  getAddConnectorFlyout: (
    props: Omit<ConnectorAddFlyoutProps, 'actionTypeRegistry'>
  ) => ReactElement<ConnectorAddFlyoutProps>;
  getEditConnectorFlyout: (
    props: Omit<ConnectorEditFlyoutProps, 'actionTypeRegistry'>
  ) => ReactElement<ConnectorEditFlyoutProps>;
  getAddAlertFlyout: (
    props: Omit<RuleAddProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>
  ) => ReactElement<RuleAddProps>;
  getEditAlertFlyout: (
    props: Omit<RuleEditProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>
  ) => ReactElement<RuleEditProps>;
  getAlertsTable: (props: AlertsTableProps) => ReactElement<AlertsTableProps>;
  getRuleStatusDropdown: (props: RuleStatusDropdownProps) => ReactElement<RuleStatusDropdownProps>;
}

interface PluginsSetup {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  cloud?: { isCloudEnabled: boolean };
}

interface PluginsStart {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
  features: FeaturesPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export class Plugin
  implements
    CorePlugin<
      TriggersAndActionsUIPublicPluginSetup,
      TriggersAndActionsUIPublicPluginStart,
      PluginsSetup,
      PluginsStart
    >
{
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  private ruleTypeRegistry: TypeRegistry<RuleTypeModel>;
  private alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry>;
  private config: TriggersActionsUiConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(ctx: PluginInitializerContext) {
    this.actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    this.alertsTableConfigurationRegistry = new TypeRegistry<AlertsTableConfigurationRegistry>();
    this.config = ctx.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): TriggersAndActionsUIPublicPluginSetup {
    const actionTypeRegistry = this.actionTypeRegistry;
    const ruleTypeRegistry = this.ruleTypeRegistry;
    const alertsTableConfigurationRegistry = this.alertsTableConfigurationRegistry;

    ExperimentalFeaturesService.init({ experimentalFeatures: this.experimentalFeatures });

    const featureTitle = i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
      defaultMessage: 'Rules and Connectors',
    });
    const featureDescription = i18n.translate(
      'xpack.triggersActionsUI.managementSection.displayDescription',
      {
        defaultMessage: 'Detect conditions using rules, and take actions using connectors.',
      }
    );

    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN_ID,
        title: featureTitle,
        description: featureDescription,
        icon: 'watchesApp',
        path: '/app/management/insightsAndAlerting/triggersActions',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: PLUGIN_ID,
      title: featureTitle,
      order: 0,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          PluginsStart,
          unknown
        ];

        const { renderApp } = await import('./application/app');

        // The `/api/features` endpoint requires the "Global All" Kibana privilege. Users with a
        // subset of this privilege are not authorized to access this endpoint and will receive a 404
        // error that causes the Alerting view to fail to load.
        let kibanaFeatures: KibanaFeature[];
        try {
          kibanaFeatures = await pluginsStart.features.getFeatures();
        } catch (err) {
          kibanaFeatures = [];
        }

        return renderApp({
          ...coreStart,
          data: pluginsStart.data,
          dataViews: pluginsStart.dataViews,
          charts: pluginsStart.charts,
          alerting: pluginsStart.alerting,
          spaces: pluginsStart.spaces,
          unifiedSearch: pluginsStart.unifiedSearch,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          element: params.element,
          theme$: params.theme$,
          storage: new Storage(window.localStorage),
          setBreadcrumbs: params.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry,
          ruleTypeRegistry,
          alertsTableConfigurationRegistry,
          kibanaFeatures,
        });
      },
    });

    registerBuiltInActionTypes({
      actionTypeRegistry: this.actionTypeRegistry,
    });

    if (this.experimentalFeatures.internalAlertsTable) {
      registerAlertsTableConfiguration({
        alertsTableConfigurationRegistry: this.alertsTableConfigurationRegistry,
      });
    }

    return {
      actionTypeRegistry: this.actionTypeRegistry,
      ruleTypeRegistry: this.ruleTypeRegistry,
      alertsTableConfigurationRegistry: this.alertsTableConfigurationRegistry,
    };
  }

  public start(): TriggersAndActionsUIPublicPluginStart {
    return {
      actionTypeRegistry: this.actionTypeRegistry,
      ruleTypeRegistry: this.ruleTypeRegistry,
      alertsTableConfigurationRegistry: this.alertsTableConfigurationRegistry,
      getAddConnectorFlyout: (props: Omit<ConnectorAddFlyoutProps, 'actionTypeRegistry'>) => {
        return getAddConnectorFlyoutLazy({ ...props, actionTypeRegistry: this.actionTypeRegistry });
      },
      getEditConnectorFlyout: (props: Omit<ConnectorEditFlyoutProps, 'actionTypeRegistry'>) => {
        return getEditConnectorFlyoutLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
        });
      },
      getAddAlertFlyout: (props: Omit<RuleAddProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>) => {
        return getAddAlertFlyoutLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
          ruleTypeRegistry: this.ruleTypeRegistry,
        });
      },
      getEditAlertFlyout: (
        props: Omit<RuleEditProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>
      ) => {
        return getEditAlertFlyoutLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
          ruleTypeRegistry: this.ruleTypeRegistry,
        });
      },
      getAlertsTable: (props: AlertsTableProps) => {
        return getAlertsTableLazy(props);
      },
      getRuleStatusDropdown: (props: RuleStatusDropdownProps) => {
        return getRuleStatusDropdownLazy(props);
      },
    };
  }

  public stop() {}
}
