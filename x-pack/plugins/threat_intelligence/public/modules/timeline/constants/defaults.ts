/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultHeaders } from '.';

export const timelineDefaults = {
  activeTab: 'query',
  prevActiveTab: 'query',
  columns: defaultHeaders,
  documentType: '',
  defaultColumns: defaultHeaders,
  dataProviders: [],
  dataViewId: null,
  dateRange: { from: '2022-09-06T09:53:30.557Z', end: '2022-09-07T09:53:30.557Z' },
  deletedEventIds: [],
  description: '',
  eqlOptions: {
    eventCategoryField: 'event.category',
    tiebreakerField: '',
    timestampField: '@timestamp',
    query: '',
    size: 100,
  },
  eventType: 'all',
  eventIdToNoteIds: {},
  excludedRowRendererIds: [],
  expandedDetail: {},
  highlightedDropAndProviderId: '',
  historyIds: [],
  filters: [],
  indexNames: [],
  isFavorite: false,
  isLive: false,
  isSelectAllChecked: false,
  isLoading: false,
  isSaving: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: null,
  },
  loadingEventIds: [],
  resolveTimelineConfig: undefined,
  queryFields: [],
  title: '',
  timelineType: 'default',
  templateTimelineId: null,
  templateTimelineVersion: null,
  noteIds: [],
  pinnedEventIds: {},
  pinnedEventsSaveObject: {},
  savedObjectId: null,
  selectAll: false,
  selectedEventIds: {},
  sessionViewConfig: null,
  show: false,
  showCheckboxes: false,
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'date',
      esTypes: ['date'],
      sortDirection: 'desc',
    },
  ],
  status: 'draft',
  version: null,
};
