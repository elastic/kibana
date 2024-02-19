/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery, BoolQuery, Query, Filter, TimeRange } from '@kbn/es-query';

export type AnyQuery = Query | AggregateQuery;
export interface ISOTimeRange {
  from: string;
  to: string;
}

export interface Timestamps {
  from: number;
  to: number;
}

export interface ParsedQuery {
  bool: BoolQuery;
}

export interface HostsViewQueryContextWithSavedQueryId {
  savedQueryId: string;
}

export interface HostsViewQueryContextWithQuery {
  query: AnyQuery;
}

export interface HostsViewQueryContextWithDataView {
  dataView: DataView;
}

export interface HostsViewQueryContextWithParsedQuery {
  parsedQuery: ParsedQuery;
}

export interface HostsViewQueryContextWithFilters {
  filters: Filter[];
}

export interface HostsViewQueryContextWithValidationError {
  validationError: Error;
}

export interface HostsViewQueryContextWithTimeRange {
  timeRange: TimeRange;
}

export interface HostsViewQueryContextWithTimestamps {
  timestamps: Timestamps;
}

export interface HostsViewQueryContextWithISOTimeRange {
  isoTimeRange: ISOTimeRange;
}

export interface HostsViewQueryContextWithControlPanels {
  controlPanels: ControlPanels;
}

export interface HostsViewQueryContextWithPanelFilters {
  panelFilters: Filter[];
}

export type HostsViewQueryContextWithTime = HostsViewQueryContextWithTimeRange &
  HostsViewQueryContextWithTimestamps &
  HostsViewQueryContextWithISOTimeRange;

export interface ReceivedServicesCompletitionEvent {
  type: 'RECEIVED_SERVICES_COMPLETITION';
}

export type HostsViewQueryTypestate =
  | {
      value: 'uninitialized';
      context: HostsViewQueryContextWithTime & HostsViewQueryContextWithDataView;
    }
  | {
      value: 'query' | { query: 'validating' };
      context: HostsViewQueryContextWithParsedQuery &
        HostsViewQueryContextWithQuery &
        HostsViewQueryContextWithFilters &
        HostsViewQueryContextWithTime &
        HostsViewQueryContextWithTimestamps &
        HostsViewQueryContextWithDataView &
        HostsViewQueryContextWithControlPanels &
        HostsViewQueryContextWithPanelFilters;
    }
  | {
      value: { query: 'valid' };
      context: HostsViewQueryContextWithParsedQuery &
        HostsViewQueryContextWithQuery &
        HostsViewQueryContextWithFilters &
        HostsViewQueryContextWithTime &
        HostsViewQueryContextWithTimestamps &
        HostsViewQueryContextWithDataView &
        HostsViewQueryContextWithControlPanels &
        HostsViewQueryContextWithPanelFilters;
    }
  | {
      value: { query: 'invalid' };
      context: HostsViewQueryContextWithParsedQuery &
        HostsViewQueryContextWithQuery &
        HostsViewQueryContextWithFilters &
        HostsViewQueryContextWithTime &
        HostsViewQueryContextWithValidationError &
        HostsViewQueryContextWithTimestamps &
        HostsViewQueryContextWithDataView &
        HostsViewQueryContextWithControlPanels &
        HostsViewQueryContextWithPanelFilters;
    };

export type HostsViewQueryContext = HostsViewQueryTypestate['context'];
export type HostsViewQueryStateValue = HostsViewQueryTypestate['value'];

export interface UpdateTimeRangeEvent {
  type: 'UPDATE_TIME_RANGE';
  timeRange: Partial<TimeRange>;
}

export interface UpdateFiltersEvent {
  type: 'UPDATE_FILTERS';
  filters: Filter[];
}

export interface UpdateControlPanelsEvent {
  type: 'UPDATE_CONTROL_PANELS';
  controlPanels: ControlPanels;
}

export interface UpdateControlPanelFiltersEvent {
  type: 'PANEL_FILTERS_CHANGED';
  panelFilters: Filter[];
}

export type HostsViewQueryEvent =
  | ReceivedServicesCompletitionEvent
  | {
      type: 'QUERY_FROM_SEARCH_BAR_CHANGED';
      query: AnyQuery;
    }
  | {
      type: 'FILTERS_FROM_SEARCH_BAR_CHANGED';
      filters: Filter[];
    }
  | {
      type: 'VALIDATION_SUCCEEDED';
      parsedQuery: ParsedQuery;
    }
  | {
      type: 'VALIDATION_FAILED';
      validationError: Error;
    }
  | {
      type: 'INITIALIZED_FROM_URL';
      query: AnyQuery;
      filters: Filter[];
      timeRange: TimeRange | null;
      controlPanels: ControlPanels | null;
      panelFilters: Filter[];
    }
  | {
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE';
      timeRange: TimeRange;
    }
  | {
      type: 'TIME_FROM_TIME_FILTER_SERVICE_CHANGED';
      timeRange: TimeRange;
    }
  | {
      type: 'INITIALIZED_FROM_CONTROL_PANELS_SERVICE';
      controlPanels: ControlPanels;
    }
  | {
      type: 'CONTROLS_FROM_CONTROL_PANELS_SERVICE_CHANGED';
      controlPanels: ControlPanels;
    }
  | UpdateTimeRangeEvent
  | UpdateFiltersEvent
  | UpdateControlPanelsEvent
  | UpdateControlPanelFiltersEvent;

const controlMetaRT = rt.type({
  order: rt.number,
  width: rt.union([rt.literal('medium'), rt.literal('small'), rt.literal('large')]),
  grow: rt.boolean,
  type: rt.string,
  explicitInput: rt.intersection([
    rt.type({ id: rt.string }),
    rt.partial({
      dataViewId: rt.string,
      fieldName: rt.string,
      title: rt.union([rt.string, rt.undefined]),
      selectedOptions: rt.array(rt.string),
    }),
  ]),
});

export const controlPanelsRT = rt.record(rt.string, controlMetaRT);
export type ControlPanels = rt.TypeOf<typeof controlPanelsRT>;
