/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../../../../../../src/plugins/ui_actions/public';
import {
  ValueClickTriggerContext,
  RangeSelectTriggerContext,
} from '../../../../../../src/plugins/embeddable/public';
import { VisualizeEmbeddableContract } from '../../../../../../src/plugins/visualizations/public';
import { KibanaURL } from './kibana_url';
import * as shared from './shared';
import { AbstractExploreDataAction } from './abstract_explore_data_action';

export type ExploreDataChartActionContext = ValueClickTriggerContext | RangeSelectTriggerContext;

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
    embeddable: VisualizeEmbeddableContract
  ): Promise<KibanaURL> => {
    const { plugins } = this.params.start();
    const { urlGenerator } = plugins.discover;

    if (!urlGenerator) {
      throw new Error('Discover URL generator not available.');
    }

    const { timeRange, query, filters } = embeddable.getInput();
    const indexPatternId = shared.getIndexPattern(embeddable);

    const path = await urlGenerator.createUrl({
      indexPatternId,
      filters,
      query,
      timeRange,
    });

    return new KibanaURL(path);
  };
}
