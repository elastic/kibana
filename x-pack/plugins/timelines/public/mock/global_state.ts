/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '../../common/search_strategy';
import { TimelineState } from '../types';
import { defaultHeaders } from './header';

export const mockGlobalState: TimelineState = {
  timelineById: {
    test: {
      columns: defaultHeaders,
      dateRange: {
        start: '2020-07-07T08:20:18.966Z',
        end: '2020-07-08T08:20:18.966Z',
      },
      dataProviders: [],
      dataViewId: null,
      deletedEventIds: [],
      excludedRowRendererIds: [],
      expandedDetail: {},
      kqlQuery: { filterQuery: null },
      id: 'test',
      indexNames: [
        'apm-*-transaction*',
        'traces-apm*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'winlogbeat-*',
      ],
      isLoading: false,
      isSelectAllChecked: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      loadingEventIds: [],
      showCheckboxes: false,
      sort: [{ columnId: '@timestamp', columnType: 'number', sortDirection: Direction.desc }],
      selectedEventIds: {},
      savedObjectId: null,
      version: null,
      documentType: '',
      defaultColumns: defaultHeaders,
      footerText: 'total of events',
      loadingText: 'loading events',
      queryFields: [],
      selectAll: false,
      title: 'Events',
      timelineType: 'default',
    },
  },
};
