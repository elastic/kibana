/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { APPLY_FILTER_TRIGGER } from '../../../../../../../src/plugins/ui_actions/public';
import {
  DashboardUrlGenerator,
  DashboardUrlGeneratorState,
} from '../../../../../../../src/plugins/dashboard/public';
import { CollectConfigContainer } from './components';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { UiActionsEnhancedDrilldownDefinition as Drilldown } from '../../../../../ui_actions_enhanced/public';
import { txtGoToDashboard } from './i18n';
import {
  ApplyGlobalFilterActionContext,
  esFilters,
  isFilters,
  isQuery,
  isTimeRange,
} from '../../../../../../../src/plugins/data/public';
import { StartServicesGetter } from '../../../../../../../src/plugins/kibana_utils/public';
import { StartDependencies } from '../../../plugin';
import { Config, FactoryContext } from './types';
import { SearchInput } from '../../../../../../../src/plugins/discover/public';

export interface Params {
  start: StartServicesGetter<Pick<StartDependencies, 'data' | 'uiActionsEnhanced'>>;
  getDashboardUrlGenerator: () => DashboardUrlGenerator;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, typeof APPLY_FILTER_TRIGGER, FactoryContext> {
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

  public supportedTriggers(): Array<typeof APPLY_FILTER_TRIGGER> {
    return [APPLY_FILTER_TRIGGER];
  }

  public readonly getHref = async (
    config: Config,
    context: ApplyGlobalFilterActionContext
  ): Promise<string> => {
    return this.getDestinationUrl(config, context);
  };

  public readonly execute = async (config: Config, context: ApplyGlobalFilterActionContext) => {
    const dashboardPath = await this.getDestinationUrl(config, context);
    const dashboardHash = dashboardPath.split('#')[1];

    await this.params.start().core.application.navigateToApp('dashboards', {
      path: `#${dashboardHash}`,
    });
  };

  private getDestinationUrl = async (
    config: Config,
    context: ApplyGlobalFilterActionContext
  ): Promise<string> => {
    const state: DashboardUrlGeneratorState = {
      dashboardId: config.dashboardId,
    };

    if (context.embeddable) {
      const input = context.embeddable.getInput() as Readonly<SearchInput>;
      if (isQuery(input.query) && config.useCurrentFilters) state.query = input.query;

      // if useCurrentDashboardDataRange is enabled, then preserve current time range
      // if undefined is passed, then destination dashboard will figure out time range itself
      // for brush event this time range would be overwritten
      if (isTimeRange(input.timeRange) && config.useCurrentDateRange)
        state.timeRange = input.timeRange;

      // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned and unpinned)
      // otherwise preserve only pinned
      if (isFilters(input.filters))
        state.filters = config.useCurrentFilters
          ? input.filters
          : input.filters?.filter((f) => esFilters.isFilterPinned(f));
    }

    const {
      restOfFilters: filtersFromEvent,
      timeRange: timeRangeFromEvent,
    } = esFilters.extractTimeRange(context.filters, context.timeFieldName);

    if (filtersFromEvent) {
      state.filters = [...(state.filters ?? []), ...filtersFromEvent];
    }

    if (timeRangeFromEvent) {
      state.timeRange = timeRangeFromEvent;
    }

    return this.params.getDashboardUrlGenerator().createUrl(state);
  };
}
