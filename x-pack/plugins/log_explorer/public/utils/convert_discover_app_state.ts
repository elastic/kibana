/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/public';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { ExistsFilter, Filter, FILTERS, PhrasesFilter } from '@kbn/es-query';
import { PhraseFilterValue } from '@kbn/es-query/src/filters/build_filters';
import { cloneDeep } from 'lodash';
import {
  ChartDisplayOptions,
  DisplayOptions,
  GridColumnDisplayOptions,
  GridRowsDisplayOptions,
} from '../../common';
import { ControlOptions, OptionsListControlOption } from '../controller';

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

const createDiscoverPhrasesFilter = ({
  key,
  values,
  negate,
}: {
  values: PhraseFilterValue[];
  key: string;
  negate?: boolean;
}): PhrasesFilter =>
  ({
    meta: {
      key,
      negate,
      type: FILTERS.PHRASES,
      params: values,
    },
    query: {
      bool: {
        should: values.map((value) => ({ match_phrase: { [key]: value.toString() } })),
        minimum_should_match: 1,
      },
    },
  } as PhrasesFilter);

const createDiscoverExistsFilter = ({
  key,
  negate,
}: {
  key: string;
  negate?: boolean;
}): ExistsFilter => ({
  meta: {
    key,
    negate,
    type: FILTERS.EXISTS,
  },
  query: { exists: { field: key } },
});

export const getDiscoverFiltersFromState = (filters: Filter[] = [], controls?: ControlOptions) => [
  ...filters,
  ...(controls
    ? (Object.keys(controls) as Array<keyof ControlOptions>).map((key) =>
        controls[key as keyof ControlOptions]?.selection.type === 'exists'
          ? createDiscoverExistsFilter({
              key,
              negate: controls[key]?.mode === 'exclude',
            })
          : createDiscoverPhrasesFilter({
              key,
              values: (controls[key]?.selection as OptionsListControlOption).selectedOptions,
              negate: controls[key]?.mode === 'exclude',
            })
      )
    : []),
];
