/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../../../../../../src/plugins/ui_actions/public';
import { EmbeddableContext } from '../../../../../../src/plugins/embeddable/public';
import { DiscoverUrlGeneratorState } from '../../../../../../src/plugins/discover/public';
import { isTimeRange, isQuery, isFilters } from '../../../../../../src/plugins/data/public';
import { KibanaURL } from './kibana_url';
import * as shared from './shared';
import { AbstractExploreDataAction } from './abstract_explore_data_action';

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

/**
 * This is "Explore underlying data" action which appears in the context
 * menu of a dashboard panel.
 */
export class ExploreDataContextMenuAction extends AbstractExploreDataAction<EmbeddableContext>
  implements Action<EmbeddableContext> {
  public readonly id = ACTION_EXPLORE_DATA;

  public readonly type = ACTION_EXPLORE_DATA;

  public readonly order = 200;

  protected readonly getUrl = async (context: EmbeddableContext): Promise<KibanaURL> => {
    const { plugins } = this.params.start();
    const { urlGenerator } = plugins.discover;

    if (!urlGenerator) {
      throw new Error('Discover URL generator not available.');
    }

    const { embeddable } = context;
    const state: DiscoverUrlGeneratorState = {};

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
