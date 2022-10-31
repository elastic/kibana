/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defaultHeaders } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import type { SubsetTGridModel } from './model';

export const tableDefaults: SubsetTGridModel = {
  defaultColumns: defaultHeaders,
  dataViewId: null,
  deletedEventIds: [],
  expandedDetail: {},
  filters: [],
  indexNames: [],
  isSelectAllChecked: false,
  isLoading: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
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
  graphEventId: '',
  sessionViewConfig: null,
  columns: defaultHeaders,
  queryFields: [],
};
