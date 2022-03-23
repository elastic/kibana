/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import { TGridIntegratedProps } from '../components/t_grid/integrated';
import { mockBrowserFields, mockDocValueFields, mockRuntimeMappings } from './browser_fields';
import { mockDataProviders } from './mock_data_providers';
import { mockTimelineData } from './mock_timeline_data';
import { ColumnHeaderOptions, TimelineId } from '../../common/types';
import { mockIndexNames, mockIndexPattern } from './index_pattern';
import { EventRenderedViewProps } from '../components/t_grid/event_rendered_view';

const columnHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Status',
    id: ALERT_STATUS,
    initialWidth: 79,
    category: 'kibana',
    type: 'string',
    aggregatable: true,
    actions: {
      showSortAsc: {
        label: 'Sort A-Z',
      },
      showSortDesc: {
        label: 'Sort Z-A',
      },
    },
    defaultSortDirection: 'desc',
    display: {
      key: null,
      ref: null,
      props: {
        children: {
          key: null,
          ref: null,
          props: {
            children: 'Status',
          },
          _owner: null,
        },
      },
      _owner: null,
    },
    isSortable: true,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Triggered',
    id: ALERT_START,
    initialWidth: 176,
    category: 'kibana',
    type: 'date',
    aggregatable: true,
    actions: {
      showSortAsc: {
        label: 'Sort A-Z',
      },
      showSortDesc: {
        label: 'Sort Z-A',
      },
    },
    defaultSortDirection: 'desc',
    display: {
      key: null,
      ref: null,
      props: {
        children: {
          key: null,
          ref: null,
          props: {
            children: 'Triggered',
          },
          _owner: null,
        },
      },
      _owner: null,
    },
    isSortable: true,
  },
];

export const tGridIntegratedProps: TGridIntegratedProps = {
  additionalFilters: null,
  appId: '',
  browserFields: mockBrowserFields,
  columns: columnHeaders,
  dataProviders: mockDataProviders,
  dataViewId: 'data-view-id',
  deletedEventIds: [],
  disabledCellActions: [],
  docValueFields: mockDocValueFields,
  end: '2021-08-19T00:30:00.000Z',
  entityType: 'alerts',
  filterStatus: 'open',
  filters: [],
  globalFullScreen: false,
  graphEventId: undefined,
  hasAlertsCrud: true,
  id: TimelineId.active,
  indexNames: mockIndexNames,
  indexPattern: mockIndexPattern,
  isLive: false,
  isLoadingIndexPattern: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  kqlMode: 'filter',
  query: {
    query: '_id: "28bf94ad5d16b5fded1b258127aa88792f119d7e018c35869121613385619e1e"',
    language: 'kuery',
  },
  renderCellValue: () => null,
  rowRenderers: [],
  runtimeMappings: mockRuntimeMappings,
  setQuery: () => null,
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'date',
      sortDirection: 'desc',
    },
  ],
  start: '2021-05-01T18:14:07.522Z',
  tGridEventRenderedViewEnabled: true,
  trailingControlColumns: [],
};

export const eventRenderedProps: EventRenderedViewProps = {
  alertToolbar: <></>,
  appId: '',
  browserFields: mockBrowserFields,
  events: mockTimelineData,
  leadingControlColumns: [],
  onChangePage: () => null,
  onChangeItemsPerPage: () => null,
  pageIndex: 0,
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  rowRenderers: [],
  totalItemCount: 100,
};
