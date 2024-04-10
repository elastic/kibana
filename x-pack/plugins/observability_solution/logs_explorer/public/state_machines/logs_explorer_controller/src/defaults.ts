/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS_PER_PAGE,
  LOG_LEVEL_FIELD,
} from '../../../../common/constants';
import { AllDatasetSelection } from '../../../../common/data_source_selection';
import { DefaultLogsExplorerControllerState } from './types';

export const DEFAULT_CONTEXT: DefaultLogsExplorerControllerState = {
  dataSourceSelection: AllDatasetSelection.create(),
  grid: {
    columns: DEFAULT_COLUMNS,
    rows: {
      rowHeight: ROWS_HEIGHT_OPTIONS.single,
      rowsPerPage: DEFAULT_ROWS_PER_PAGE,
    },
  },
  chart: {
    breakdownField: LOG_LEVEL_FIELD,
  },
  filters: [],
  query: {
    language: 'kuery',
    query: '',
  },
  refreshInterval: {
    pause: true,
    value: 60000,
  },
  time: {
    mode: 'relative',
    from: 'now-15m/m',
    to: 'now',
  },
  rows: [],
};
