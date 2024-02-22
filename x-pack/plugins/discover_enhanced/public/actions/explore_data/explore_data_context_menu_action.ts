/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  apiHasParentApi,
  apiPublishesPartialLocalUnifiedSearch,
  EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import { AbstractExploreDataAction } from './abstract_explore_data_action';
import * as shared from './shared';

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

/**
 * This is "Explore underlying data" action which appears in the context
 * menu of a dashboard panel.
 */
export class ExploreDataContextMenuAction
  extends AbstractExploreDataAction
  implements Action<EmbeddableApiContext>
{
  public readonly id = ACTION_EXPLORE_DATA;

  public readonly type = ACTION_EXPLORE_DATA;

  public readonly order = 200;

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    return await super.isCompatible({ embeddable });
  }

  public async getLocation({ embeddable }: EmbeddableApiContext): Promise<KibanaLocation> {
    const { plugins } = this.params.start();
    const { locator } = plugins.discover;

    if (!locator) {
      throw new Error('Discover URL locator not available.');
    }

    const params: DiscoverAppLocatorParams = {};
    params.dataViewId = shared.getDataViews(embeddable)[0] || undefined;

    if (
      apiHasParentApi(embeddable) &&
      apiPublishesPartialLocalUnifiedSearch(embeddable.parentApi)
    ) {
      /** This action does not pass its own local state, it only passes the parent API state */
      if (embeddable.parentApi.localTimeRange)
        params.timeRange = embeddable.parentApi.localTimeRange.getValue();
      if (embeddable.parentApi.localQuery)
        params.query = embeddable.parentApi.localQuery.getValue();
      if (embeddable.parentApi.localFilters) {
        const filters = embeddable.parentApi.localFilters.getValue() ?? [];
        params.filters = [...filters, ...(params.filters || [])];
      }
    }

    const location = await locator.getLocation(params);
    return location;
  }
}
