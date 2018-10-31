/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Range } from './body/column_headers/range_picker/ranges';
import { ColumnId } from './body/column_id';
import { SortDirection } from './body/sort';
import { DataProvider } from './data_providers/data_provider';

/** Invoked when a user clicks the close button to remove a data provider */
export type OnDataProviderRemoved = (removed: DataProvider) => void;

/** Invoked when a user temporarily disables or re-enables a data provider */
export type OnToggleDataProviderEnabled = (
  toggled: {
    dataProvider: DataProvider;
    enabled: boolean;
  }
) => void;

/** Invoked when a user toggles negation ("boolean NOT") of a data provider */
export type OnToggleDataProviderNegated = (
  negated: {
    dataProvider: DataProvider;
    negated: boolean;
  }
) => void;

/** Invoked when a user selects a new minimap time range */
export type OnRangeSelected = (range: Range) => void;

/** Invoked when a user updates a column's filter */
export type OnFilterChange = (
  filter: {
    columnId: ColumnId;
    filter: string;
  }
) => void;

/** Invoked when a column is sorted */
export type OnColumnSorted = (
  sorted: {
    columnId: ColumnId;
    sortDirection: SortDirection;
  }
) => void;
