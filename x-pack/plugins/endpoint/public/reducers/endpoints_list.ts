/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { EndpointListActions, actions } from '../actions/endpoints_list';

// TODO: type hits properly
interface EndpointsListState {
  data: {
    hits: {
      hits: any[];
      total: {
        value: number;
      };
    };
  };
  isFiltered: boolean;
  filteredData: any[];
  pageIndex: number;
  pageSize: number;
  showPerPageOptions: boolean;
  sortField?: string;
  sortDirection?: Direction;
  selectedItems: object[];
}

const initialState: EndpointsListState = {
  data: {
    hits: {
      hits: [],
      total: {
        value: 0,
      },
    },
  },
  isFiltered: false,
  filteredData: [],
  pageIndex: 0,
  pageSize: 10,
  showPerPageOptions: true,
  selectedItems: [],
};

export function endpointListReducer(
  state = initialState,
  action: EndpointListActions
): EndpointsListState {
  switch (action.type) {
    case actions.serverReturnedEndpointListData.type:
      return { ...state, data: action.payload[0] };
    case actions.userFilteredEndpointListData.type:
      return { ...state, ...action.payload[0] };
    default:
      return state;
  }
}
