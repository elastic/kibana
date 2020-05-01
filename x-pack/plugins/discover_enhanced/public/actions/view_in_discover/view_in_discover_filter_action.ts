/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keys } from 'lodash';
import moment from 'moment';
import { Action } from '../../../../../../src/plugins/ui_actions/public';
import {
  IEmbeddable,
  ViewMode,
  ValueClickTriggerContext,
  RangeSelectTriggerContext,
} from '../../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../../src/core/public';
import { DISCOVER_APP_URL_GENERATOR } from '../../../../../../src/plugins/discover/public';
import { DiscoverEnhancedStartDependencies } from '../../plugin';
import {
  VisualizeEmbeddableContract,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '../../../../../../src/plugins/visualizations/public';
import { esFilters, RangeFilter, TimeRange } from '../../../../../../src/plugins/data/public';

export const ACTION_VIEW_IN_DISCOVER_FILTER = 'ACTION_VIEW_IN_DISCOVER_FILTER';

export type ActionContext = ValueClickTriggerContext | RangeSelectTriggerContext;

const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

const isVisualizeEmbeddable = (
  embeddable?: IEmbeddable
): embeddable is VisualizeEmbeddableContract => embeddable?.type === VISUALIZE_EMBEDDABLE_TYPE;

const isValueClickTriggerContext = (
  context: ValueClickTriggerContext | RangeSelectTriggerContext
): context is ValueClickTriggerContext => context.data && 'data' in context.data;

const isRangeSelectTriggerContext = (
  context: ValueClickTriggerContext | RangeSelectTriggerContext
): context is RangeSelectTriggerContext => context.data && 'range' in context.data;

export function convertRangeFilterToTimeRange(filter: RangeFilter) {
  const key = keys(filter.range)[0];
  const values = filter.range[key];

  return {
    from: moment(values.gt || values.gte),
    to: moment(values.lt || values.lte),
  };
}

const convertRangeFilterToTimeRangeString = (filter: RangeFilter): TimeRange => {
  const { from, to } = convertRangeFilterToTimeRange(filter);
  return {
    from: from?.toISOString(),
    to: to?.toISOString(),
  };
};

interface Params {
  start: StartServicesGetter<
    Pick<DiscoverEnhancedStartDependencies, 'data' | 'share'>,
    unknown,
    Pick<CoreStart, 'application'>
  >;
}

export class ViewInDiscoverFilterAction implements Action<ActionContext> {
  public readonly id = ACTION_VIEW_IN_DISCOVER_FILTER;

  public readonly type = ACTION_VIEW_IN_DISCOVER_FILTER;

  public readonly order = 200;

  constructor(private readonly params: Params) {}

  public getDisplayName() {
    return 'View in Discover';
  }

  public getIconType() {
    return 'discoverApp';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    if (!isVisualizeEmbeddable(embeddable)) return false;
    if (!this.getIndexPattern(embeddable)) return false;
    if (embeddable.getInput().viewMode !== ViewMode.VIEW) return false;
    return true;
  }

  public async execute(context: ActionContext) {
    if (!isVisualizeEmbeddable(context.embeddable)) return;

    const { core } = this.params.start();
    const url = await this.getUrl(context);

    await core.application.navigateToApp('kibana', {
      path: '#' + url.split('#')[1],
    });
  }

  public async getHref(context: ActionContext): Promise<string> {
    if (!isVisualizeEmbeddable(context.embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName()}" action.`);
    }

    const { core } = this.params.start();
    const url = await this.getUrl(context);

    return core.application.getUrlForApp('kibana', {
      path: '#' + url.split('#')[1],
    });
  }

  private async getUrl(context: ActionContext): Promise<string> {
    const { embeddable, timeFieldName } = context;

    if (!isVisualizeEmbeddable(embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName()}" action.`);
    }

    const { plugins } = this.params.start();
    const {
      createFiltersFromRangeSelectAction,
      createFiltersFromValueClickAction,
    } = plugins.data.actions;

    // eslint-disable-next-line prefer-const
    let { timeRange, query, filters } = embeddable.getInput();
    const indexPatternId = this.getIndexPattern(embeddable);
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

    if (timeFieldName) {
      const { timeRangeFilter, restOfFilters } = esFilters.extractTimeFilter(
        timeFieldName,
        filtersFromEvent
      );
      filtersFromEvent = restOfFilters;
      if (timeRangeFilter) {
        timeRange = convertRangeFilterToTimeRangeString(timeRangeFilter);
      }
    }

    const url = await plugins
      .share!.urlGenerators.getUrlGenerator(DISCOVER_APP_URL_GENERATOR)
      .createUrl({
        indexPatternId,
        filters: [...(filters || []), ...filtersFromEvent],
        query,
        timeRange,
      });

    return url;
  }

  /**
   * @returns Returns empty string if no index pattern ID found.
   */
  private getIndexPattern(embeddable: VisualizeEmbeddableContract): string {
    const output = embeddable!.getOutput();

    if (isOutputWithIndexPatterns(output) && output.indexPatterns.length > 0) {
      return output.indexPatterns[0].id;
    }

    return '';
  }
}
