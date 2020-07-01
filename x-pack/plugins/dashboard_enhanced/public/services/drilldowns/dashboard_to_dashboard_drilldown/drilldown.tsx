/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { DashboardUrlGenerator } from '../../../../../../../src/plugins/dashboard/public';
import { Config } from './types';
import { CollectConfigContainer } from './components';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../../ui_actions_enhanced/public';
import { txtGoToDashboard } from './i18n';
import {
  esFilters,
  isFilters,
  isQuery,
  isTimeRange,
} from '../../../../../../../src/plugins/data/public';

import { StartServicesGetter } from '../../../../../../../src/plugins/kibana_utils/public';
import { StartDependencies } from '../../../plugin';
import { ApplyFilterTriggerContext } from '../../../../../../../src/plugins/ui_actions/public';

export interface Params {
  start: StartServicesGetter<Pick<StartDependencies, 'data' | 'uiActionsEnhanced'>>;
  getDashboardUrlGenerator: () => DashboardUrlGenerator;
}

export type ActionContext = ApplyFilterTriggerContext;

export class DashboardToDashboardDrilldown implements Drilldown<Config, ActionContext> {
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

  public readonly getHref = async (config: Config, context: ActionContext): Promise<string> => {
    return this.getDestinationUrl(config, context);
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    const dashboardPath = await this.getDestinationUrl(config, context);
    const dashboardHash = dashboardPath.split('#')[1];

    await this.params.start().core.application.navigateToApp('dashboards', {
      path: `#${dashboardHash}`,
    });
  };

  private getDestinationUrl = async (config: Config, context: ActionContext): Promise<string> => {
    const embeddableInput = context.embeddable!.getInput();
    const currentFilters = isFilters(embeddableInput.filters) ? embeddableInput.filters : [];
    const currentTimeRange = isTimeRange(embeddableInput.timeRange)
      ? embeddableInput.timeRange
      : undefined;
    const currentQuery = isQuery(embeddableInput.query) ? embeddableInput.query : undefined;

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

    let filtersFromEvent = context.filters;
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

    return this.params.getDashboardUrlGenerator().createUrl({
      dashboardId: config.dashboardId,
      query: config.useCurrentFilters ? currentQuery : undefined,
      timeRange,
      filters: [...existingFilters, ...filtersFromEvent],
    });
  };
}
