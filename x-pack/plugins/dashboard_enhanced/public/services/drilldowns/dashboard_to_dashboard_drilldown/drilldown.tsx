/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { SharePluginStart } from '../../../../../../../src/plugins/share/public';
import {
  DASHBOARD_APP_URL_GENERATOR,
  DashboardContainerInput,
} from '../../../../../../../src/plugins/dashboard/public';
import { VisualizeEmbeddableContract } from '../../../../../../../src/legacy/core_plugins/visualizations/public';
import { PlaceContext, ActionContext, Config, CollectConfigProps } from './types';

import { CollectConfigContainer } from './collect_config';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownDefinition as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';
import { DataPublicPluginStart, esFilters } from '../../../../../../../src/plugins/data/public';

export interface Params {
  getSavedObjectsClient: () => Promise<CoreStart['savedObjects']['client']>;
  getNavigateToApp: () => Promise<CoreStart['application']['navigateToApp']>;
  getGetUrlGenerator: () => Promise<SharePluginStart['urlGenerators']['getUrlGenerator']>;
  getDataPluginActions: () => Promise<DataPublicPluginStart['actions']>;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, PlaceContext, ActionContext<VisualizeEmbeddableContract>> {
  constructor(protected readonly params: Params) {}

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = props => (
    <CollectConfigContainer {...props} deps={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '',
    useCurrentFilters: false,
    useCurrentDateRange: false,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly execute = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ) => {
    const getUrlGenerator = await this.params.getGetUrlGenerator();
    const navigateToApp = await this.params.getNavigateToApp();
    const savedObjectsClient = await this.params.getSavedObjectsClient();

    const {
      selectRangeActionGetFilters,
      valueClickActionGetFilters,
    } = await this.params.getDataPluginActions();
    const {
      timeRange: currentTimeRange,
      query,
      filters: currentFilters,
    } = context.embeddable.getInput();

    const savedDashboard = await savedObjectsClient.get<{ timeTo: string; timeFrom: string }>(
      'dashboard',
      config.dashboardId as string
    );

    const defaultTimeRange = {
      to: savedDashboard.attributes.timeTo,
      from: savedDashboard.attributes.timeFrom,
    };

    // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned and unpinned)
    // otherwise preserve only pinned
    const filters =
      (config.useCurrentFilters
        ? currentFilters
        : currentFilters?.filter(f => esFilters.isFilterPinned(f))) ?? [];

    // if useCurrentDashboardDataRange is enabled, then preserve current time range
    // if undefined is passed, then destination dashboard will figure out time range itself
    // for brush event this time range would be overwritten
    let timeRange = config.useCurrentDateRange ? currentTimeRange : defaultTimeRange;

    if (context.data.range) {
      // look up by range
      const { restOfFilters, timeRangeFilter } =
        (await selectRangeActionGetFilters({
          timeFieldName: context.timeFieldName,
          data: context.data,
        })) || {};
      filters.push(...(restOfFilters || []));
      if (timeRangeFilter) {
        timeRange = esFilters.convertRangeFilterToTimeRangeString(timeRangeFilter);
      }
    } else {
      const { restOfFilters, timeRangeFilter } = await valueClickActionGetFilters({
        timeFieldName: context.timeFieldName,
        data: context.data,
      });
      filters.push(...(restOfFilters || []));
      if (timeRangeFilter) {
        timeRange = esFilters.convertRangeFilterToTimeRangeString(timeRangeFilter);
      }
    }

    const dashboardPath = await getUrlGenerator(DASHBOARD_APP_URL_GENERATOR).createUrl({
      dashboardId: config.dashboardId,
      query,
      timeRange,
      filters,
    });

    const dashboardHash = dashboardPath.split('#')[1];

    await navigateToApp('kibana', {
      path: `#${dashboardHash}`,
    });
  };
}
