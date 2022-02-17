/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '../../../common/search_strategy';
import type { ColumnHeaderOptions, ColumnHeaderType } from '../../../common/types/timeline';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../components/t_grid/body/constants';
import type { SubsetTGridModel } from './model';
import * as i18n from './translations';

export const defaultColumnHeaderType: ColumnHeaderType = 'not-filtered';

export const defaultHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    type: 'number',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
];

export const tGridDefaults: SubsetTGridModel = {
  columns: defaultHeaders,
  defaultColumns: defaultHeaders,
  dataViewId: null,
  dateRange: { start: '', end: '' },
  deletedEventIds: [],
  excludedRowRendererIds: [],
  expandedDetail: {},
  filters: [],
  kqlQuery: {
    filterQuery: null,
  },
  indexNames: [],
  isLoading: false,
  isSelectAllChecked: false,
  itemsPerPage: 50,
  itemsPerPageOptions: [10, 25, 50, 100],
  loadingEventIds: [],
  selectedEventIds: {},
  showCheckboxes: false,
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'date',
      sortDirection: Direction.desc,
    },
  ],
  savedObjectId: null,
  version: null,
};

export const getTGridManageDefaults = (id: string) => ({
  defaultColumns: defaultHeaders,
  loadingText: i18n.LOADING_EVENTS,
  footerText: i18n.TOTAL_COUNT_OF_EVENTS,
  documentType: '',
  selectAll: false,
  id,
  isLoading: false,
  queryFields: [],
  title: '',
  unit: (n: number) => i18n.UNIT(n),
});
