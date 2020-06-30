/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { DashboardUrlGenerator } from '../../../../../../../src/plugins/dashboard/public';
import { ActionContext, Config } from './types';
import { CollectConfigContainer } from './components';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../../ui_actions_enhanced/public';
import { txtGoToDashboard } from './i18n';
import { esFilters } from '../../../../../../../src/plugins/data/public';
import { VisualizeEmbeddableContract } from '../../../../../../../src/plugins/visualizations/public';
import {
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
} from '../../../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../../../src/plugins/kibana_utils/public';
import { StartDependencies } from '../../../plugin';

export interface Params {
  start: StartServicesGetter<Pick<StartDependencies, 'data' | 'uiActionsEnhanced'>>;
  getDashboardUrlGenerator: () => DashboardUrlGenerator;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, ActionContext<VisualizeEmbeddableContract>> {
  constructor(protected readonly params: Params) {}

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigContainer['props']> = (props) => (
    <CollectConfigContainer {...props} params={this.params} />
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

  public readonly getHref = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ): Promise<string> => {
    return this.getDestinationUrl(config, context);
  };

  public readonly execute = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ) => {
    const dashboardPath = await this.getDestinationUrl(config, context);
    const dashboardHash = dashboardPath.split('#')[1];

    await this.params.start().core.application.navigateToApp('dashboards', {
      path: `#${dashboardHash}`,
    });
  };

  private getDestinationUrl = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ): Promise<string> => {
    const {
      createFiltersFromRangeSelectAction,
      createFiltersFromValueClickAction,
    } = this.params.start().plugins.data.actions;
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
        : currentFilters?.filter((f) => esFilters.isFilterPinned(f))) ?? [];

    // if useCurrentDashboardDataRange is enabled, then preserve current time range
    // if undefined is passed, then destination dashboard will figure out time range itself
    // for brush event this time range would be overwritten
    let timeRange = config.useCurrentDateRange ? currentTimeRange : undefined;
    let filtersFromEvent = await (async () => {
      try {
        if (isRangeSelectTriggerContext(context))
          return await createFiltersFromRangeSelectAction(context.data);
        if (isValueClickTriggerContext(context))
          return await createFiltersFromValueClickAction(context.data);

        // eslint-disable-next-line no-console
        console.warn(
          `
          DashboardToDashboard drilldown: can't extract filters from action.
          Is it not supported action?`,
          context
        );

        return [];
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          `
          DashboardToDashboard drilldown: error extracting filters from action.
          Continuing without applying filters from event`,
          e
        );
        return [];
      }
    })();

    if (context.data.timeFieldName) {
      const { timeRangeFilter, restOfFilters } = esFilters.extractTimeFilter(
        context.data.timeFieldName,
        filtersFromEvent
      );
      filtersFromEvent = restOfFilters;
      if (timeRangeFilter) {
        timeRange = esFilters.convertRangeFilterToTimeRangeString(timeRangeFilter);
      }
    }

    return this.params.getDashboardUrlGenerator().createUrl({
      dashboardId: config.dashboardId,
      query: config.useCurrentFilters ? query : undefined,
      timeRange,
      filters: [...existingFilters, ...filtersFromEvent],
    });
  };
}
