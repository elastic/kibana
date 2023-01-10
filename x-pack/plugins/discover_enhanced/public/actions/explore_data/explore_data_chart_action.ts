/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from '@kbn/ui-actions-plugin/public';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { SearchInput } from '@kbn/discover-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { KibanaLocation } from '@kbn/share-plugin/public';
import * as shared from './shared';
import { AbstractExploreDataAction } from './abstract_explore_data_action';

export interface ExploreDataChartActionContext extends ApplyGlobalFilterActionContext {
  embeddable?: IEmbeddable;
}

export const ACTION_EXPLORE_DATA_CHART = 'ACTION_EXPLORE_DATA_CHART';

/**
 * This is "Explore underlying data" action which appears in popup context
 * menu when user clicks a value in visualization or brushes a time range.
 */
export class ExploreDataChartAction
  extends AbstractExploreDataAction<ExploreDataChartActionContext>
  implements Action<ExploreDataChartActionContext>
{
  public readonly id = ACTION_EXPLORE_DATA_CHART;

  public readonly type = ACTION_EXPLORE_DATA_CHART;

  public readonly order = 200;

  public async isCompatible(context: ExploreDataChartActionContext): Promise<boolean> {
    if (context.embeddable?.type === 'map') return false; // TODO: https://github.com/elastic/kibana/issues/73043
    return super.isCompatible(context);
  }

  protected readonly getLocation = async (
    context: ExploreDataChartActionContext
  ): Promise<KibanaLocation> => {
    const { plugins } = this.params.start();
    const { locator } = plugins.discover;

    if (!locator) {
      throw new Error('Discover URL locator not available.');
    }

    const { embeddable } = context;
    const { extractTimeRange } = await import('@kbn/es-query');
    const { restOfFilters: filters, timeRange } = extractTimeRange(
      context.filters,
      context.timeFieldName
    );

    const params: DiscoverAppLocatorParams = {
      filters,
      timeRange,
    };

    if (embeddable) {
      params.indexPatternId = shared.getIndexPatterns(embeddable)[0] || undefined;

      const input = embeddable.getInput() as Readonly<SearchInput>;

      if (input.timeRange && !params.timeRange) params.timeRange = input.timeRange;
      if (input.query) params.query = input.query;
      if (input.filters) params.filters = [...input.filters, ...(params.filters || [])];
    }

    const location = await locator.getLocation(params);

    return location;
  };
}
