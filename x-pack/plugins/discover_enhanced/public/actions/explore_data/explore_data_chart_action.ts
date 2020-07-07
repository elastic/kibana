/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../../../../../../src/plugins/ui_actions/public';
import {
  ValueClickContext,
  RangeSelectContext,
} from '../../../../../../src/plugins/embeddable/public';
import { DiscoverUrlGeneratorState } from '../../../../../../src/plugins/discover/public';
import { isTimeRange, isQuery, isFilters } from '../../../../../../src/plugins/data/public';
import { KibanaURL } from './kibana_url';
import * as shared from './shared';
import { AbstractExploreDataAction } from './abstract_explore_data_action';

export type ExploreDataChartActionContext = ValueClickContext | RangeSelectContext;

export const ACTION_EXPLORE_DATA_CHART = 'ACTION_EXPLORE_DATA_CHART';

/**
 * This is "Explore underlying data" action which appears in popup context
 * menu when user clicks a value in visualization or brushes a time range.
 */
export class ExploreDataChartAction extends AbstractExploreDataAction<ExploreDataChartActionContext>
  implements Action<ExploreDataChartActionContext> {
  public readonly id = ACTION_EXPLORE_DATA_CHART;

  public readonly type = ACTION_EXPLORE_DATA_CHART;

  public readonly order = 200;

  protected readonly getUrl = async (
    context: ExploreDataChartActionContext
  ): Promise<KibanaURL> => {
    const { plugins } = this.params.start();
    const { urlGenerator } = plugins.discover;

    if (!urlGenerator) {
      throw new Error('Discover URL generator not available.');
    }

    const { embeddable } = context;
    const { filters, timeRange } = await plugins.embeddable.filtersAndTimeRangeFromContext(context);
    const state: DiscoverUrlGeneratorState = {
      filters,
      timeRange,
    };

    if (embeddable) {
      state.indexPatternId = shared.getIndexPatterns(embeddable)[0] || undefined;

      const input = embeddable.getInput();

      if (isTimeRange(input.timeRange) && !state.timeRange) state.timeRange = input.timeRange;
      if (isQuery(input.query)) state.query = input.query;
      if (isFilters(input.filters)) state.filters = [...input.filters, ...(state.filters || [])];
    }

    const path = await urlGenerator.createUrl(state);

    return new KibanaURL(path);
  };
}
