/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaLocation } from '@kbn/share-plugin/public';
import React from 'react';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import {
  AdvancedUiActionsStart,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
  UiActionsEnhancedDrilldownDefinition as Drilldown,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { CollectConfigProps, StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { DrilldownConfig } from '../../../../common/drilldowns/dashboard_drilldown/types';
import { CollectConfigContainer } from './components';
import { txtGoToDashboard } from './i18n';
import { Config } from './types';

export interface Params {
  start: StartServicesGetter<{
    uiActionsEnhanced: AdvancedUiActionsStart;
    data: DataPublicPluginStart;
    dashboard: DashboardStart;
  }>;
}

export abstract class AbstractDashboardDrilldown<Context extends object = object>
  implements Drilldown<Config, Context>
{
  constructor(protected readonly params: Params) {
    this.ReactCollectConfig = (props) => <CollectConfigContainer {...props} params={this.params} />;
    this.CollectConfig = this.ReactCollectConfig;
  }

  public abstract readonly id: string;

  public abstract readonly supportedTriggers: () => string[];

  protected abstract getLocation(
    config: Config,
    context: Context,
    useUrlForState: boolean
  ): Promise<KibanaLocation>;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<
    CollectConfigProps<Config, BaseActionFactoryContext>
  >;

  public readonly CollectConfig: React.FC<
    CollectConfigProps<DrilldownConfig, BaseActionFactoryContext>
  >;

  public readonly createConfig = () => ({
    dashboardId: '',
    useCurrentFilters: true,
    useCurrentDateRange: true,
    openInNewTab: false,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly getHref = async (config: Config, context: Context): Promise<string> => {
    const { app, path } = await this.getLocation(config, context, true);
    const url = await this.params.start().core.application.getUrlForApp(app, {
      path,
      absolute: true,
    });
    return url;
  };

  public readonly execute = async (config: Config, context: Context) => {
    if (config.openInNewTab) {
      window.open(await this.getHref(config, context), '_blank');
    } else {
      const { app, path, state } = await this.getLocation(config, context, false);
      await this.params.start().core.application.navigateToApp(app, { path, state });
    }
  };

  protected get locator() {
    const locator = this.params.start().plugins.dashboard.locator;
    if (!locator) throw new Error('Dashboard locator is required for dashboard drilldown.');
    return locator;
  }
}
