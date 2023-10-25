/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import {
  DATA_GRID_COLUMNS_PREFERENCES,
  DATA_GRID_DEFAULT_COLUMNS,
  DEFAULT_ROWS_PER_PAGE,
  LOG_LEVEL_FIELD,
} from '../../../../common/constants';
import { AllDatasetSelection } from '../../../../common/dataset_selection';
import { DefaultLogExplorerControllerState } from './types';

export const DEFAULT_CONTEXT: DefaultLogExplorerControllerState = {
  datasetSelection: AllDatasetSelection.create(),
  // Display options
  columns: DATA_GRID_DEFAULT_COLUMNS,
  grid: {
    columns: DATA_GRID_COLUMNS_PREFERENCES,
  },
  rowHeight: ROWS_HEIGHT_OPTIONS.single,
  rowsPerPage: DEFAULT_ROWS_PER_PAGE,
  breakdownField: LOG_LEVEL_FIELD,
};
