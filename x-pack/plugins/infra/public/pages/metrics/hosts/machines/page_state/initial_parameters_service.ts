/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/data-plugin/common';
import { Filter } from '@kbn/es-query';
import { InvokeCreator, Receiver } from 'xstate';
import { AnyQuery, ParsedQuery, ISOTimeRange, Timestamps, ControlPanels } from '../query_state';
import { HostsViewPageContext, HostsViewPageEvent } from './types';

export const waitForInitialQueryParameters =
  (): InvokeCreator<HostsViewPageContext, HostsViewPageEvent> =>
  (_context, _event) =>
  (send, onEvent: Receiver<HostsViewPageEvent>) => {
    // constituents of the set of initial parameters
    let latestQuery: AnyQuery | undefined;
    let latestValidQuery: ParsedQuery | undefined;
    let latestTimeRange: TimeRange | undefined;
    let latestTimestamps: Timestamps | undefined;
    let latestISOTimeRange: ISOTimeRange | undefined;
    let latestFilters: Filter[] = [];
    let lastestControlPanels: ControlPanels | undefined;
    let latestPanelFilters: Filter[] = [];

    onEvent((event) => {
      switch (event.type) {
        case 'VALID_QUERY_CHANGED':
        case 'INVALID_QUERY_CHANGED':
          latestQuery = event.query;
          latestValidQuery = event.parsedQuery;
          latestFilters = event.filters;
          break;
        case 'TIME_CHANGED':
          latestTimeRange = event.timeRange;
          latestISOTimeRange = event.isoTimeRange;
          latestTimestamps = event.timestamps;
          break;
        case 'CONTROL_PANELS_CHANGED':
          lastestControlPanels = event.controlPanels;
          break;
        case 'PANEL_FILTERS_CHANGED':
          latestPanelFilters = event.panelFilters;
          break;
      }

      if (
        latestValidQuery !== undefined &&
        latestTimeRange !== undefined &&
        latestISOTimeRange !== undefined &&
        latestQuery !== undefined &&
        latestTimestamps !== undefined &&
        lastestControlPanels !== undefined
      ) {
        send({
          type: 'RECEIVED_INITIAL_QUERY_PARAMETERS',
          query: latestQuery,
          timeRange: latestTimeRange,
          parsedQuery: latestValidQuery,
          isoTimeRange: latestISOTimeRange,
          timestamps: latestTimestamps,
          filters: latestFilters,
          controlPanels: lastestControlPanels,
          panelFilters: latestPanelFilters,
        });
      }
    });
  };
