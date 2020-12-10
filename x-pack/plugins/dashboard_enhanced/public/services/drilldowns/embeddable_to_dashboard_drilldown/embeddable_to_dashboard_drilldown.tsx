/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TriggerContextMapping,
  APPLY_FILTER_TRIGGER,
} from '../../../../../../../src/plugins/ui_actions/public';
import { DashboardUrlGeneratorState } from '../../../../../../../src/plugins/dashboard/public';
import {
  esFilters,
  isFilters,
  isQuery,
  isTimeRange,
} from '../../../../../../../src/plugins/data/public';
import {
  AbstractDashboardDrilldown,
  AbstractDashboardDrilldownParams,
  AbstractDashboardDrilldownConfig as Config,
} from '../abstract_dashboard_drilldown';
import { KibanaURL } from '../../../../../../../src/plugins/share/public';
import { EMBEDDABLE_TO_DASHBOARD_DRILLDOWN } from './constants';
import { createExtract, createInject } from '../../../../common';

type Trigger = typeof APPLY_FILTER_TRIGGER;
type Context = TriggerContextMapping[Trigger];
export type Params = AbstractDashboardDrilldownParams;

/**
 * This drilldown is the "Go to Dashboard" you can find in Dashboard app panles.
 * This drilldown can be used on any embeddable and it is tied to embeddables
 * in two ways: (1) it works with APPLY_FILTER_TRIGGER, which is usually executed
 * by embeddables (but not necessarily); (2) its `getURL` method depends on
 * `embeddable` field being present in `context`.
 */
export class EmbeddableToDashboardDrilldown extends AbstractDashboardDrilldown<Trigger> {
  public readonly id = EMBEDDABLE_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [APPLY_FILTER_TRIGGER] as Trigger[];

  protected async getURL(config: Config, context: Context): Promise<KibanaURL> {
    const state: DashboardUrlGeneratorState = {
      dashboardId: config.dashboardId,
    };

    if (context.embeddable) {
      const input = context.embeddable.getInput();
      if (isQuery(input.query) && config.useCurrentFilters) state.query = input.query;

      // if useCurrentDashboardDataRange is enabled, then preserve current time range
      // if undefined is passed, then destination dashboard will figure out time range itself
      // for brush event this time range would be overwritten
      if (isTimeRange(input.timeRange) && config.useCurrentDateRange)
        state.timeRange = input.timeRange;

      // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned and unpinned)
      // otherwise preserve only pinned
      if (isFilters(input.filters))
        state.filters = config.useCurrentFilters
          ? input.filters
          : input.filters?.filter((f) => esFilters.isFilterPinned(f));
    }

    const {
      restOfFilters: filtersFromEvent,
      timeRange: timeRangeFromEvent,
    } = esFilters.extractTimeRange(context.filters, context.timeFieldName);

    if (filtersFromEvent) {
      state.filters = [...(state.filters ?? []), ...filtersFromEvent];
    }

    if (timeRangeFromEvent) {
      state.timeRange = timeRangeFromEvent;
    }

    const path = await this.urlGenerator.createUrl(state);
    const url = new KibanaURL(path);

    return url;
  }

  public readonly inject = createInject({ drilldownId: this.id });

  public readonly extract = createExtract({ drilldownId: this.id });
}
