/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defaultHeaders } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { normalizeTimeRange } from '../../utils/normalize_time_range';
import type { SubsetTGridModel } from './model';

// normalizeTimeRange uses getTimeRangeSettings which cannot be used outside Kibana context if the uiSettings is not false
const { from: start, to: end } = normalizeTimeRange({ from: '', to: '' }, false);

export const tableDefaults: SubsetTGridModel = {
  defaultColumns: defaultHeaders,
  dataProviders: [],
  dataViewId: null,
  dateRange: { start, end },
  deletedEventIds: [],
  excludedRowRendererIds: [],
  expandedDetail: {},
  filters: [],
  indexNames: [],
  isSelectAllChecked: false,
  isLoading: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  kqlQuery: {
    filterQuery: null,
  },
  loadingEventIds: [],
  selectedEventIds: {},
  showCheckboxes: false,
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'date',
      esTypes: ['date'],
      sortDirection: 'desc',
    },
  ],
  version: null,
  graphEventId: '',
  kqlMode: 'filter',
  sessionViewConfig: null,
  savedObjectId: null,
  columns: defaultHeaders,
};
