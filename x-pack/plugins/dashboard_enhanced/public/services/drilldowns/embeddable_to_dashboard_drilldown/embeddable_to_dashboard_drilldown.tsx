/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaLocation } from 'src/plugins/share/public';
import { DashboardAppLocatorParams } from '../../../../../../../src/plugins/dashboard/public';
import {
  ApplyGlobalFilterActionContext,
  APPLY_FILTER_TRIGGER,
  esFilters,
  Filter,
  isFilters,
  isQuery,
  isTimeRange,
  Query,
  TimeRange,
} from '../../../../../../../src/plugins/data/public';
import { IEmbeddable, EmbeddableInput } from '../../../../../../../src/plugins/embeddable/public';
import {
  AbstractDashboardDrilldown,
  AbstractDashboardDrilldownParams,
  AbstractDashboardDrilldownConfig as Config,
} from '../abstract_dashboard_drilldown';
import { EMBEDDABLE_TO_DASHBOARD_DRILLDOWN } from './constants';
import { createExtract, createInject } from '../../../../common';
import { EnhancedEmbeddableContext } from '../../../../../embeddable_enhanced/public';

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

  protected async getLocation(config: Config, context: Context): Promise<KibanaLocation> {
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
          : input.filters?.filter((f) => esFilters.isFilterPinned(f));
    }

    const {
      restOfFilters: filtersFromEvent,
      timeRange: timeRangeFromEvent,
    } = esFilters.extractTimeRange(context.filters, context.timeFieldName);

    if (filtersFromEvent) {
      params.filters = [...(params.filters ?? []), ...filtersFromEvent];
    }

    if (timeRangeFromEvent) {
      params.timeRange = timeRangeFromEvent;
    }

    const location = await this.locator.getLocation(params);

    return location;
  }

  public readonly inject = createInject({ drilldownId: this.id });

  public readonly extract = createExtract({ drilldownId: this.id });
}
