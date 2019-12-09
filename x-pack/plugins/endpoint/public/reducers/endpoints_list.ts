/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import {
  EndpointListActions,
  actions,
  EndpointListServerDataAction,
  EndpointListFilteredDataAction,
  EndpointListPageAndSortedDataAction,
} from '../actions/endpoints_list';
import { EndpointData } from '../../server/types';

export interface EndpointsListState {
  data: {
    hits: {
      hits: EndpointData[];
      total: {
        value: number;
      };
    };
    aggregations?: {
      total: {
        value: number;
      };
    };
  };
  isFiltered: boolean;
  filteredData: EndpointData[];
  pageIndex: number;
  pageSize: number;
  showPerPageOptions: boolean;
  sortField?: string;
  sortDirection?: Direction;
}

const initialState: EndpointsListState = {
  data: {
    hits: {
      hits: [],
      total: {
        value: 0,
      },
    },
    aggregations: {
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
};

export function endpointListReducer(
  state = initialState,
  action: EndpointListActions
): EndpointsListState {
  switch (action.type) {
    case actions.serverReturnedEndpointListData.type:
      return { ...state, data: (action as EndpointListServerDataAction).payload[0] };

    case actions.userFilteredEndpointListData.type:
      const { filteredData, isFiltered } = (action as EndpointListFilteredDataAction).payload[0];
      return { ...state, filteredData, isFiltered };

    case actions.userPaginatedOrSortedEndpointListTable.type:
      const {
        pageIndex,
        pageSize,
        sortField,
        sortDirection,
      } = (action as EndpointListPageAndSortedDataAction).payload[0];
      return {
        ...state,
        pageIndex,
        pageSize,
        sortField,
        sortDirection,
      };
    default:
      return state;
  }
}
