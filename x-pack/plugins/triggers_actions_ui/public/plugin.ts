/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin as CorePlugin } from 'src/core/public';

import { i18n } from '@kbn/i18n';
import { ReactElement } from 'react';
import { PluginInitializerContext } from 'kibana/public';
import { FeaturesPluginStart } from '../../features/public';
import { KibanaFeature } from '../../features/common';
import { registerBuiltInActionTypes } from './application/components/builtin_action_types';
import { TypeRegistry } from './application/type_registry';
import {
  ManagementAppMountParams,
  ManagementSetup,
} from '../../../../src/plugins/management/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';
import { PluginStartContract as AlertingStart } from '../../alerting/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import type { SpacesPluginStart } from '../../spaces/public';

import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';
import { getAddAlertFlyoutLazy } from './common/get_add_alert_flyout';
import { getEditAlertFlyoutLazy } from './common/get_edit_alert_flyout';
import { getAlertsTableLazy } from './common/get_alerts_table';
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
} from './types';
import { TriggersActionsUiConfigType } from '../common/types';
import type { UnifiedSearchPublicPluginStart } from '../../../../src/plugins/unified_search/public';

export interface TriggersAndActionsUIPublicPluginSetup {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}

export interface TriggersAndActionsUIPublicPluginStart {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
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
}

interface PluginsSetup {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  cloud?: { isCloudEnabled: boolean };
}

interface PluginsStart {
  data: DataPublicPluginStart;
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
  private config: TriggersActionsUiConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(ctx: PluginInitializerContext) {
    this.actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    this.config = ctx.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): TriggersAndActionsUIPublicPluginSetup {
    const actionTypeRegistry = this.actionTypeRegistry;
    const ruleTypeRegistry = this.ruleTypeRegistry;

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
        id: 'triggersActions',
        title: featureTitle,
        description: featureDescription,
        icon: 'watchesApp',
        path: '/app/management/insightsAndAlerting/triggersActions',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: 'triggersActions',
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
          kibanaFeatures,
        });
      },
    });

    registerBuiltInActionTypes({
      actionTypeRegistry: this.actionTypeRegistry,
    });

    return {
      actionTypeRegistry: this.actionTypeRegistry,
      ruleTypeRegistry: this.ruleTypeRegistry,
    };
  }

  public start(): TriggersAndActionsUIPublicPluginStart {
    return {
      actionTypeRegistry: this.actionTypeRegistry,
      ruleTypeRegistry: this.ruleTypeRegistry,
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
    };
  }

  public stop() {}
}
