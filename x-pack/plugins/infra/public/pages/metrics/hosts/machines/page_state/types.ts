/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, TimeRange } from '@kbn/es-query';
import {
  AnyQuery,
  ControlPanels,
  HostsViewQueryContextWithControlPanels,
  HostsViewQueryContextWithFilters,
  HostsViewQueryContextWithTime,
  HostsViewQueryContextWithValidationError,
  ParsedQuery,
  UpdateControlPanelFiltersEvent,
  UpdateControlPanelsEvent,
  UpdateFiltersEvent,
  UpdateTimeRangeEvent,
} from '../query_state';
import { HostsViewQueryNotificationEvent } from '../query_state/notifications';
import {
  DataViewContextWithError,
  DataViewContextWithDataView,
  DataViewNotificationEvent,
} from '../data_view_state';

export interface ReceivedInitialQueryParametersEvent {
  type: 'RECEIVED_INITIAL_QUERY_PARAMETERS';
  timeRange: HostsViewPageContextWithTime['timeRange'];
  isoTimeRange: HostsViewPageContextWithTime['isoTimeRange'];
  timestamps: HostsViewPageContextWithTime['timestamps'];
  query: HostsViewPageContextWithQuery['query'];
  parsedQuery: HostsViewPageContextWithParsedQuery['parsedQuery'];
  filters: HostsViewPageContextWithFilters['filters'];
  controlPanels: HostsViewPageContextWithControlPanels['controlPanels'];
  panelFilters: HostsViewPageContextWithPanelFilters['panelFilters'];
}

export type HostsViewPageEvent =
  | DataViewNotificationEvent
  | HostsViewQueryNotificationEvent
  | ReceivedInitialQueryParametersEvent
  | UpdateTimeRangeEvent
  | UpdateFiltersEvent
  | UpdateControlPanelsEvent
  | UpdateControlPanelFiltersEvent;

export interface HostsViewPageContextWithDataView {
  dataView: DataViewContextWithDataView['dataView'];
}

export interface HostsViewPageContextWithDataViewError {
  dataViewError: DataViewContextWithError['error'];
  indexPattern: DataViewContextWithError['indexPattern'];
}

export interface HostsViewPageContextWithQueryParseError {
  validationError: HostsViewQueryContextWithValidationError['validationError'];
}

export interface HostsViewPageContextWithParsedQuery {
  parsedQuery: ParsedQuery;
}

export interface HostsViewPageContextWithQuery {
  query: AnyQuery;
}

export interface HostsViewPageContextWithPanelFilters {
  panelFilters: Filter[];
}

export type HostsViewPageContextWithControlPanels = HostsViewQueryContextWithControlPanels;
export type HostsViewPageContextWithTime = HostsViewQueryContextWithTime;
export type HostsViewPageContextWithFilters = HostsViewQueryContextWithFilters;

export type HostsViewPageTypestate =
  | {
      value: 'uninitialized';
      context: {};
    }
  | {
      value: 'loadingDataView';
      context: {};
    }
  | {
      value: 'loadingDataViewFailed';
      context: HostsViewPageContextWithDataViewError;
    }
  | {
      value: 'hasDataViewIndices';
      context: HostsViewPageContextWithDataView;
    }
  | {
      value: { hasDataViewIndices: 'uninitialized' };
      context: HostsViewPageContextWithDataView;
    }
  | {
      value: { hasDataViewIndices: 'initialized' };
      context: HostsViewPageContextWithDataView &
        HostsViewPageContextWithParsedQuery &
        HostsViewPageContextWithTime &
        HostsViewPageContextWithQuery &
        HostsViewPageContextWithFilters &
        HostsViewPageContextWithControlPanels &
        HostsViewPageContextWithPanelFilters &
        HostsViewPageContextWithQueryParseError;
    };

export type HostsViewPageStateValue = HostsViewPageTypestate['value'];
export type HostsViewPageContext = HostsViewPageTypestate['context'];

export interface HostsViewPageCallbacks {
  updateControlPanels: (controlPanels: ControlPanels) => void;
  updateControlPanelFilters: (controlFilters: Filter[]) => void;
  updateTimeRange: (timeRange: TimeRange) => void;
}
