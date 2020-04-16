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
import { PlaceContext, ActionContext, Config } from './types';
import { CollectConfigContainer } from './components';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownDefinition as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';
import { DataPublicPluginStart, esFilters } from '../../../../../../../src/plugins/data/public';
import { VisualizeEmbeddableContract } from '../../../../../../../src/plugins/visualizations/public';

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

  private readonly ReactCollectConfig: React.FC<CollectConfigContainer['props']> = props => (
    <CollectConfigContainer {...props} deps={this.params} />
  );

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

  public readonly execute = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ) => {
    const getUrlGenerator = await this.params.getGetUrlGenerator();
    const navigateToApp = await this.params.getNavigateToApp();

    const {
      createFiltersFromRangeSelectAction,
      createFiltersFromValueClickAction,
    } = await this.params.getDataPluginActions();
    const {
      timeRange: currentTimeRange,
      query,
      filters: currentFilters,
    } = context.embeddable!.getInput();

    // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned and unpinned)
    // otherwise preserve only pinned
    const existingFilters =
      (config.useCurrentFilters
        ? currentFilters
        : currentFilters?.filter(f => esFilters.isFilterPinned(f))) ?? [];

    // if useCurrentDashboardDataRange is enabled, then preserve current time range
    // if undefined is passed, then destination dashboard will figure out time range itself
    // for brush event this time range would be overwritten
    let timeRange = config.useCurrentDateRange ? currentTimeRange : undefined;
    let filtersFromEvent = await (async () => {
      // TODO: not sure what would be the best way to handle types here
      // context.data is `unknown` and comes from `EmbeddableVisTriggerContext`
      try {
        return (context.data as any).range
          ? await createFiltersFromValueClickAction(context.data as any)
          : await createFiltersFromRangeSelectAction(context.data as any);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("DashboardToDashboard drilldown: can't extract filters from event", e);
        return [];
      }
    })();

    if (context.timeFieldName) {
      const { timeRangeFilter, restOfFilters } = esFilters.extractTimeFilter(
        context.timeFieldName,
        filtersFromEvent
      );
      filtersFromEvent = restOfFilters;
      if (timeRangeFilter) {
        timeRange = esFilters.convertRangeFilterToTimeRangeString(timeRangeFilter);
      }
    }

    const dashboardPath = await getUrlGenerator(DASHBOARD_APP_URL_GENERATOR).createUrl({
      dashboardId: config.dashboardId,
      query: config.useCurrentFilters ? query : undefined,
      timeRange,
      filters: [...existingFilters, ...filtersFromEvent],
    });

    const dashboardHash = dashboardPath.split('#')[1];

    await navigateToApp('kibana', {
      path: `#${dashboardHash}`,
    });
  };
}
