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
import {
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
} from '../../../../../../../src/plugins/embeddable/public';

export interface Params {
  getSavedObjectsClient: () => CoreStart['savedObjects']['client'];
  getApplicationService: () => Pick<CoreStart['application'], 'getUrlForApp' | 'navigateToApp'>;
  getGetUrlGenerator: () => SharePluginStart['urlGenerators']['getUrlGenerator'];
  getDataPluginActions: () => DataPublicPluginStart['actions'];
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, PlaceContext, ActionContext<VisualizeEmbeddableContract>> {
  constructor(protected readonly params: Params) {
    this.getDestinationUrl = this.getDestinationUrl.bind(this);
  }

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

  public readonly getHref = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ): Promise<string> => {
    const { getUrlForApp } = await this.params.getApplicationService();
    const dashboardPath = await this.getDestinationUrl(config, context);
    // note: extracting hash and using 'kibana' as appId will be redundant,
    // when dashboard move to np urls. (urlGenerator generates np url, which is not supported yet)
    const dashboardHash = dashboardPath.split('#')[1];
    return getUrlForApp('kibana', {
      path: `#${dashboardHash}`,
    });
  };

  public readonly execute = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ) => {
    const { navigateToApp } = await this.params.getApplicationService();
    const dashboardPath = await this.getDestinationUrl(config, context);
    // note: extracting hash and using 'kibana' as appId will be redundant,
    // when dashboard move to np urls. (urlGenerator generates np url, which is not supported yet)
    const dashboardHash = dashboardPath.split('#')[1];
    await navigateToApp('kibana', {
      path: `#${dashboardHash}`,
    });
  };

  private async getDestinationUrl(
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ): Promise<string> {
    const getUrlGenerator = await this.params.getGetUrlGenerator();

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

    return getUrlGenerator(DASHBOARD_APP_URL_GENERATOR).createUrl({
      dashboardId: config.dashboardId,
      query: config.useCurrentFilters ? query : undefined,
      timeRange,
      filters: [...existingFilters, ...filtersFromEvent],
    });
  }
}
