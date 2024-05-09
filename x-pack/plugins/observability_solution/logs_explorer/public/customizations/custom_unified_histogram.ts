/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClickTriggerEvent, MultiClickTriggerEvent } from '@kbn/charts-plugin/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import type { DiscoverCustomization } from '@kbn/discover-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export type WithPreventableEvent<T> = T & {
  preventDefault(): void;
};

export type ClickTriggerEventData = ClickTriggerEvent['data'] | MultiClickTriggerEvent['data'];

type CustomClickTriggerEvent = WithPreventableEvent<ClickTriggerEventData>;

const isClickTriggerEvent = (
  e: CustomClickTriggerEvent
): e is WithPreventableEvent<ClickTriggerEvent['data']> => {
  return Array.isArray(e.data) && 'column' in e.data[0];
};

const isMultiValueTriggerEvent = (
  e: CustomClickTriggerEvent
): e is WithPreventableEvent<MultiClickTriggerEvent['data']> => {
  return Array.isArray(e.data) && 'cells' in e.data[0];
};

export const createCustomUnifiedHistogram = (
  data: DataPublicPluginStart
): DiscoverCustomization => {
  return {
    id: 'unified_histogram',
    onFilter: async (eventData) => {
      eventData.preventDefault();
      let filters;
      if (isClickTriggerEvent(eventData)) {
        filters = await data.actions.createFiltersFromValueClickAction(eventData);
      } else if (isMultiValueTriggerEvent(eventData)) {
        filters = await data.actions.createFiltersFromMultiValueClickAction(eventData);
      }
      if (filters && filters.length > 0) {
        data.query.filterManager.addFilters(filters);
      }
    },
    onBrushEnd: (eventData) => {
      eventData.preventDefault();

      const [from, to] = eventData.range;
      data.query.timefilter.timefilter.setTime({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        mode: 'absolute',
      });
    },
    withDefaultActions: false,
    disabledActions: [ACTION_GLOBAL_APPLY_FILTER],
  };
};
