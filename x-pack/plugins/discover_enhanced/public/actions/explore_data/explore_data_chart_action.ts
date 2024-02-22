/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  apiHasParentApi,
  apiIsOfType,
  apiPublishesPartialLocalUnifiedSearch,
  HasParentApi,
  PublishesLocalUnifiedSearch,
} from '@kbn/presentation-publishing';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { AbstractExploreDataAction } from './abstract_explore_data_action';
import * as shared from './shared';

export const ACTION_EXPLORE_DATA_CHART = 'ACTION_EXPLORE_DATA_CHART';

export interface ExploreDataChartActionContext extends ApplyGlobalFilterActionContext {
  embeddable: PublishesLocalUnifiedSearch & HasParentApi<Partial<PublishesLocalUnifiedSearch>>;
}

/**
 * This is "Explore underlying data" action which appears in popup context
 * menu when user clicks a value in visualization or brushes a time range.
 */

export class ExploreDataChartAction
  extends AbstractExploreDataAction
  implements Action<ExploreDataChartActionContext>
{
  public readonly id = ACTION_EXPLORE_DATA_CHART;

  public readonly type = ACTION_EXPLORE_DATA_CHART;

  public readonly order = 200;

  public async isCompatible(api: ExploreDataChartActionContext): Promise<boolean> {
    const { embeddable } = api;
    if (apiIsOfType(embeddable, 'map')) {
      return false; // TODO: https://github.com/elastic/kibana/issues/73043
    }
    return (
      apiPublishesPartialLocalUnifiedSearch(api) && apiHasParentApi(api) && super.isCompatible(api)
    );
  }

  protected readonly getLocation = async (
    api: ExploreDataChartActionContext
  ): Promise<KibanaLocation> => {
    const { plugins } = this.params.start();
    const { locator } = plugins.discover;

    if (!locator) {
      throw new Error('Discover URL locator not available.');
    }

    const { extractTimeRange } = await import('@kbn/es-query');
    const { restOfFilters: filters, timeRange } = extractTimeRange(
      api.filters ?? [],
      api.timeFieldName
    );

    const { embeddable } = api;
    const params: DiscoverAppLocatorParams = {
      filters: [...filters, ...(embeddable.parentApi.localFilters?.getValue() ?? [])],
      timeRange: timeRange ?? embeddable.parentApi.localTimeRange?.getValue(),
      query: embeddable.parentApi.localQuery?.getValue(),
    };

    params.dataViewId = shared.getDataViews(embeddable)[0] || undefined;
    if (apiPublishesPartialLocalUnifiedSearch(embeddable)) {
      if (embeddable.localTimeRange && !params.timeRange)
        params.timeRange = embeddable.localTimeRange.getValue();
      if (embeddable.localQuery) params.query = embeddable.localQuery.getValue();
      if (embeddable.localFilters) {
        params.filters = [...(embeddable.localFilters.getValue() ?? []), ...(params.filters || [])];
      }
    }

    const location = await locator.getLocation(params);
    return location;
  };
}
