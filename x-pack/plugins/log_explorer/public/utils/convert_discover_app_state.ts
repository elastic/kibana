/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverAppState } from '@kbn/discover-plugin/public';
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
  ...(discoverAppState.rowHeight ? { rowHeight: discoverAppState.rowHeight } : {}),
  ...(discoverAppState.rowsPerPage ? { rowsPerPage: discoverAppState.rowsPerPage } : {}),
});

export const getChartDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): Partial<ChartDisplayOptions> => ({
  ...(discoverAppState.breakdownField ? { breakdownField: discoverAppState.breakdownField } : {}),
});

export const getDiscoverAppStateFromDisplayOptions = (
  displayOptions: DisplayOptions
): Partial<DiscoverAppState> => ({
  breakdownField: displayOptions.chart.breakdownField,
  columns: getDiscoverColumnsFromDisplayOptions(displayOptions),
  grid: {
    columns: displayOptions.grid.columns.reduce<
      NonNullable<NonNullable<DiscoverAppState['grid']>['columns']>
    >((gridColumns, { field, width }) => {
      if (width != null) {
        gridColumns[field] = { width };
      }
      return gridColumns;
    }, {}),
  },
  rowHeight: displayOptions.grid.rows.rowHeight,
  rowsPerPage: displayOptions.grid.rows.rowsPerPage,
});

export const getDiscoverColumnsFromDisplayOptions = (
  displayOptions: DisplayOptions
): DiscoverAppState['columns'] => displayOptions.grid.columns.map(({ field }) => field);
