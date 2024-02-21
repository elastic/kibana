/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, TimeRange } from '@kbn/es-query';
import {
  AnyQuery,
  HostsViewQueryContext,
  ParsedQuery,
  ISOTimeRange,
  Timestamps,
  ControlPanels,
} from './types';

export interface TimeChangedEvent {
  type: 'TIME_CHANGED';
  timeRange: TimeRange;
  isoTimeRange: ISOTimeRange;
  timestamps: Timestamps;
}

export interface ControlPanelsChangedEvent {
  type: 'CONTROL_PANELS_CHANGED';
  controlPanels: ControlPanels;
}

export interface PanelFiltersChangedEvent {
  type: 'PANEL_FILTERS_CHANGED';
  panelFilters: Filter[];
}

export type HostsViewQueryNotificationEvent =
  | {
      type: 'VALID_QUERY_CHANGED';
      parsedQuery: ParsedQuery;
      query: AnyQuery;
      filters: Filter[];
    }
  | {
      type: 'INVALID_QUERY_CHANGED';
      parsedQuery: ParsedQuery;
      query: AnyQuery;
      filters: Filter[];
      validationError: Error;
    }
  | TimeChangedEvent
  | ControlPanelsChangedEvent
  | PanelFiltersChangedEvent;

export const hostsViewQueryNotificationEventSelectors = {
  validQueryChanged: (context: HostsViewQueryContext) =>
    'parsedQuery' in context
      ? ({
          type: 'VALID_QUERY_CHANGED',
          parsedQuery: context.parsedQuery,
          query: context.query,
          filters: context.filters,
        } as HostsViewQueryNotificationEvent)
      : undefined,
  invalidQueryChanged: (context: HostsViewQueryContext) => {
    return 'validationError' in context
      ? ({
          type: 'INVALID_QUERY_CHANGED',
          query: context.query,
          parsedQuery: context.parsedQuery,
          filters: context.filters,
          validationError: context.validationError,
        } as HostsViewQueryNotificationEvent)
      : undefined;
  },
  timeChanged: (context: HostsViewQueryContext) =>
    'timeRange' in context && 'isoTimeRange' in context && 'timestamps' in context
      ? ({
          type: 'TIME_CHANGED',
          timeRange: context.timeRange,
          isoTimeRange: context.isoTimeRange,
          timestamps: context.timestamps,
        } as HostsViewQueryNotificationEvent)
      : undefined,
  panelFiltersChanged: (context: HostsViewQueryContext) =>
    'panelFilters' in context
      ? ({
          type: 'PANEL_FILTERS_CHANGED',
          panelFilters: context.panelFilters,
        } as HostsViewQueryNotificationEvent)
      : undefined,
  controlPanelsChanged: (context: HostsViewQueryContext) => {
    return 'controlPanels' in context
      ? ({
          type: 'CONTROL_PANELS_CHANGED',
          controlPanels: context.controlPanels,
        } as HostsViewQueryNotificationEvent)
      : undefined;
  },
};
