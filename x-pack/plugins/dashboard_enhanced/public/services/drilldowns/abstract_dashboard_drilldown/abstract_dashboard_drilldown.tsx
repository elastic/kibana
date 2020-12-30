/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { DashboardStart } from 'src/plugins/dashboard/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import {
  TriggerContextMapping,
  TriggerId,
} from '../../../../../../../src/plugins/ui_actions/public';
import { CollectConfigContainer } from './components';
import {
  AdvancedUiActionsStart,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
  UiActionsEnhancedDrilldownDefinition as Drilldown,
} from '../../../../../ui_actions_enhanced/public';
import { txtGoToDashboard } from './i18n';
import {
  CollectConfigProps,
  StartServicesGetter,
} from '../../../../../../../src/plugins/kibana_utils/public';
import { KibanaURL } from '../../../../../../../src/plugins/share/public';
import { Config } from './types';

export interface Params {
  start: StartServicesGetter<{
    uiActionsEnhanced: AdvancedUiActionsStart;
    data: DataPublicPluginStart;
    dashboard: DashboardStart;
  }>;
}

export abstract class AbstractDashboardDrilldown<T extends TriggerId>
  implements Drilldown<Config, T, BaseActionFactoryContext<T>> {
  constructor(protected readonly params: Params) {}

  public abstract readonly id: string;

  public abstract readonly supportedTriggers: () => T[];

  protected abstract getURL(config: Config, context: TriggerContextMapping[T]): Promise<KibanaURL>;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<
    CollectConfigProps<Config, BaseActionFactoryContext<T>>
  > = (props) => <CollectConfigContainer {...props} params={this.params} />;

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '',
    useCurrentFilters: true,
    useCurrentDateRange: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly getHref = async (
    config: Config,
    context: TriggerContextMapping[T]
  ): Promise<string> => {
    const url = await this.getURL(config, context);
    return url.path;
  };

  public readonly execute = async (config: Config, context: TriggerContextMapping[T]) => {
    const url = await this.getURL(config, context);
    await this.params.start().core.application.navigateToApp(url.appName, { path: url.appPath });
  };

  protected get urlGenerator() {
    const urlGenerator = this.params.start().plugins.dashboard.dashboardUrlGenerator;
    if (!urlGenerator)
      throw new Error('Dashboard URL generator is required for dashboard drilldown.');
    return urlGenerator;
  }
}
