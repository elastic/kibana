/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { AlertListAction } from '../actions/alert_list';

// TODO: type hits properly
interface AlertListState {
  data: {
    hits: {
      hits: any[];
      total: {
        value: number;
      };
    };
  };
  pageIndex: number;
  pageSize: number;
  showPerPageOptions: boolean;
  sortField?: string;
  sortDirection?: Direction;
  selectedItems: object[];
}

const initialState: AlertListState = {
  data: {
    hits: {
      hits: [],
      total: {
        value: 0,
      },
    },
  },
  pageIndex: 0,
  pageSize: 10,
  showPerPageOptions: true,
  selectedItems: [],
};

// TODO: Should we use Immutable.js?
export function reducer(state = initialState, action: AlertListAction): AlertListState {
  switch (action.type) {
    case 'serverReturnedData':
      return {
        ...state,
        data: action.payload[0],
      };
    case 'userPaginatedOrSortedTable':
      const { pageIndex, pageSize, sortField, sortDirection } = action.payload[0];
      return {
        ...state,
        pageIndex,
        pageSize,
        sortField,
        sortDirection,
      };
    case 'userSelectedTableItems':
      const selectedItems = action.payload[0];
      return {
        ...state,
        selectedItems,
      };
    default:
      return state;
  }
}
