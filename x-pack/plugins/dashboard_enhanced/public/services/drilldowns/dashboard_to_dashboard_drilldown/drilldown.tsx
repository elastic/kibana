/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { SharePluginStart } from '../../../../../../../src/plugins/share/public';
import { DASHBOARD_APP_URL_GENERATOR } from '../../../../../../../src/plugins/dashboard/public';
import { VisualizeEmbeddable } from '../../../../../../../src/legacy/core_plugins/visualizations/public';
import { FactoryContext, ActionContext, Config, CollectConfigProps } from './types';
import { CollectConfigContainer } from './collect_config';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownsDrilldown as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';

export interface Params {
  getSavedObjectsClient: () => Promise<CoreStart['savedObjects']['client']>;
  getNavigateToApp: () => Promise<CoreStart['application']['navigateToApp']>;
  getGetUrlGenerator: () => Promise<SharePluginStart['urlGenerators']['getUrlGenerator']>;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, FactoryContext, ActionContext<VisualizeEmbeddable>> {
  constructor(protected readonly params: Params) {}

  // TODO: public readonly places = ['dashboard'];

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = props => (
    <CollectConfigContainer {...props} params={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '',
    useCurrentDashboardDateRange: true,
    useCurrentDashboardFilters: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly execute = async (config: Config, context: ActionContext<VisualizeEmbeddable>) => {
    // todo - need to complete this
    // console.log('DEBUG', config, context);
    // need to change date range and filter based on config
    const getUrlGenerator = await this.params.getGetUrlGenerator();
    const navigateToApp = await this.params.getNavigateToApp();
    const { timeRange, query, filters } = context.embeddable.getInput();

    const dashboardPath = await getUrlGenerator(DASHBOARD_APP_URL_GENERATOR).createUrl({
      dashboardId: config.dashboardId,
      timeRange,
      query,
      filters,
    });

    navigateToApp(dashboardPath);
  };
}
