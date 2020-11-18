/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin as CorePlugin } from 'src/core/public';

import { i18n } from '@kbn/i18n';
import { ReactElement } from 'react';
import { FeaturesPluginStart } from '../../features/public';
import { registerBuiltInActionTypes } from './application/components/builtin_action_types';
import { ActionTypeModel, AlertTypeModel } from './types';
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
import { PluginStartContract as AlertingStart } from '../../alerts/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { ConnectorAddFlyoutProps } from './application/sections/action_connector_form/connector_add_flyout';
import { ConnectorEditFlyoutProps } from './application/sections/action_connector_form/connector_edit_flyout';
import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';

export interface TriggersAndActionsUIPublicPluginSetup {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
}

export interface TriggersAndActionsUIPublicPluginStart {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  getAddConnectorFlyout: (
    props: Omit<ConnectorAddFlyoutProps, 'actionTypeRegistry'>
  ) => ReactElement<ConnectorAddFlyoutProps> | null;
  getEditConnectorFlyout: (
    props: Omit<ConnectorEditFlyoutProps, 'actionTypeRegistry'>
  ) => ReactElement<ConnectorEditFlyoutProps> | null;
}

interface PluginsSetup {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

interface PluginsStart {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  alerts?: AlertingStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
  features: FeaturesPluginStart;
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

  constructor() {
    this.actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): TriggersAndActionsUIPublicPluginSetup {
    const actionTypeRegistry = this.actionTypeRegistry;
    const alertTypeRegistry = this.alertTypeRegistry;

    const featureTitle = i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
      defaultMessage: 'Alerts and Actions',
    });
    const featureDescription = i18n.translate(
      'xpack.triggersActionsUI.managementSection.displayDescription',
      {
        defaultMessage: 'Detect conditions using alerts, and take actions using connectors.',
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
        const kibanaFeatures = await pluginsStart.features.getFeatures();
        return renderApp({
          ...coreStart,
          data: pluginsStart.data,
          charts: pluginsStart.charts,
          alerts: pluginsStart.alerts,
          element: params.element,
          storage: new Storage(window.localStorage),
          setBreadcrumbs: params.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry,
          alertTypeRegistry,
          kibanaFeatures,
        });
      },
    });

    registerBuiltInActionTypes({
      actionTypeRegistry: this.actionTypeRegistry,
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
      getAddConnectorFlyout: (props: Omit<ConnectorAddFlyoutProps, 'actionTypeRegistry'>) => {
        return getAddConnectorFlyoutLazy({ ...props, actionTypeRegistry: this.actionTypeRegistry });
      },
      getEditConnectorFlyout: (props: Omit<ConnectorEditFlyoutProps, 'actionTypeRegistry'>) => {
        return getEditConnectorFlyoutLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
        });
      },
    };
  }

  public stop() {}
}
