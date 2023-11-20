/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/public';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { cloneDeep } from 'lodash';
import {
  ChartDisplayOptions,
  DisplayOptions,
  GridColumnDisplayOptions,
  GridRowsDisplayOptions,
} from '../../common';

export const getGridColumnDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): GridColumnDisplayOptions[] | undefined =>
  discoverAppState.columns?.map((field) => ({
    field,
    width: discoverAppState.grid?.columns?.[field]?.width,
  }));

export const getGridRowsDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): Partial<GridRowsDisplayOptions> => ({
  ...(discoverAppState.rowHeight != null ? { rowHeight: discoverAppState.rowHeight } : {}),
  ...(discoverAppState.rowsPerPage != null ? { rowsPerPage: discoverAppState.rowsPerPage } : {}),
});

export const getChartDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): Partial<ChartDisplayOptions> => ({
  breakdownField: discoverAppState.breakdownField ?? null,
});

export const getQueryStateFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): QueryState => ({
  query: discoverAppState.query,
  filters: discoverAppState.filters,
});

export const getDiscoverAppStateFromContext = (
  displayOptions: DisplayOptions & QueryState
): Partial<DiscoverAppState> => ({
  breakdownField: displayOptions.chart.breakdownField ?? undefined,
  columns: getDiscoverColumnsFromDisplayOptions(displayOptions),
  grid: getDiscoverGridFromDisplayOptions(displayOptions),
  rowHeight: displayOptions.grid.rows.rowHeight,
  rowsPerPage: displayOptions.grid.rows.rowsPerPage,
  query: cloneDeep(displayOptions.query),
  filters: cloneDeep(displayOptions.filters),
});

export const getDiscoverColumnsFromDisplayOptions = (
  displayOptions: DisplayOptions
): DiscoverAppState['columns'] => displayOptions.grid.columns.map(({ field }) => field);

export const getDiscoverGridFromDisplayOptions = (
  displayOptions: DisplayOptions
): DiscoverAppState['grid'] => ({
  columns: displayOptions.grid.columns.reduce<
    NonNullable<NonNullable<DiscoverAppState['grid']>['columns']>
  >((gridColumns, { field, width }) => {
    if (width != null) {
      gridColumns[field] = { width };
    }
    return gridColumns;
  }, {}),
});
