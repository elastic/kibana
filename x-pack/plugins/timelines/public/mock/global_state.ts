/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '../../common/search_strategy';
import { TableId, TableState } from '../types';
import { defaultHeaders } from './header';

export const mockGlobalState: TableState = {
  tableById: {
    [TableId.test]: {
      columns: defaultHeaders,
      dataViewId: null,
      deletedEventIds: [],
      expandedDetail: {},
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
      sort: [
        {
          columnId: '@timestamp',
          columnType: 'date',
          esTypes: ['date'],
          sortDirection: Direction.desc,
        },
      ],
      selectedEventIds: {},
      defaultColumns: defaultHeaders,
      loadingText: 'loading events',
      queryFields: [],
      title: 'Events',
      sessionViewConfig: null,
      selectAll: false,
    },
  },
};
