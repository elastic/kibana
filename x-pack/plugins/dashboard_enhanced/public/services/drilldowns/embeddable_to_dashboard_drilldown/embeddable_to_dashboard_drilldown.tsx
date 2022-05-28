/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type Filter, isFilters, isFilterPinned } from '@kbn/es-query';
import type { KibanaLocation } from '@kbn/share-plugin/public';
import { DashboardAppLocatorParams, cleanEmptyKeys } from '@kbn/dashboard-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  isQuery,
  isTimeRange,
  Query,
  TimeRange,
  extractTimeRange,
} from '@kbn/data-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { IEmbeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { EnhancedEmbeddableContext } from '@kbn/embeddable-enhanced-plugin/public';
import {
  AbstractDashboardDrilldown,
  AbstractDashboardDrilldownParams,
  AbstractDashboardDrilldownConfig as Config,
} from '../abstract_dashboard_drilldown';
import { EMBEDDABLE_TO_DASHBOARD_DRILLDOWN } from './constants';
import { createExtract, createInject } from '../../../../common';

interface EmbeddableQueryInput extends EmbeddableInput {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

type Context = EnhancedEmbeddableContext & ApplyGlobalFilterActionContext;
export type Params = AbstractDashboardDrilldownParams;

/**
 * This drilldown is the "Go to Dashboard" you can find in Dashboard app panles.
 * This drilldown can be used on any embeddable and it is tied to embeddables
 * in two ways: (1) it works with APPLY_FILTER_TRIGGER, which is usually executed
 * by embeddables (but not necessarily); (2) its `getURL` method depends on
 * `embeddable` field being present in `context`.
 */
export class EmbeddableToDashboardDrilldown extends AbstractDashboardDrilldown<Context> {
  public readonly id = EMBEDDABLE_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [APPLY_FILTER_TRIGGER];

  protected async getLocation(
    config: Config,
    context: Context,
    useUrlForState: boolean
  ): Promise<KibanaLocation> {
    const params: DashboardAppLocatorParams = {
      dashboardId: config.dashboardId,
    };

    if (context.embeddable) {
      const embeddable = context.embeddable as IEmbeddable<EmbeddableQueryInput>;
      const input = embeddable.getInput();
      if (isQuery(input.query) && config.useCurrentFilters) params.query = input.query;

      // if useCurrentDashboardDataRange is enabled, then preserve current time range
      // if undefined is passed, then destination dashboard will figure out time range itself
      // for brush event this time range would be overwritten
      if (isTimeRange(input.timeRange) && config.useCurrentDateRange)
        params.timeRange = input.timeRange;

      // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned and unpinned)
      // otherwise preserve only pinned
      if (isFilters(input.filters))
        params.filters = config.useCurrentFilters
          ? input.filters
          : input.filters?.filter((f) => isFilterPinned(f));
    }

    const { restOfFilters: filtersFromEvent, timeRange: timeRangeFromEvent } = extractTimeRange(
      context.filters,
      context.timeFieldName
    );

    if (filtersFromEvent) {
      params.filters = [...(params.filters ?? []), ...filtersFromEvent];
    }

    if (timeRangeFromEvent) {
      params.timeRange = timeRangeFromEvent;
    }

    const location = await this.locator.getLocation(params);
    if (useUrlForState) {
      this.useUrlForState(location);
    }

    return location;
  }

  private useUrlForState(location: KibanaLocation<DashboardAppLocatorParams>) {
    const state = location.state;
    location.path = setStateToKbnUrl(
      '_a',
      cleanEmptyKeys({
        query: state.query,
        filters: state.filters?.filter((f) => !isFilterPinned(f)),
        savedQuery: state.savedQuery,
      }),
      { useHash: false, storeInHashQuery: true },
      location.path
    );
  }

  public readonly inject = createInject({ drilldownId: this.id });

  public readonly extract = createExtract({ drilldownId: this.id });
}
