/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { actionCreatorFactory } from '../lib/action_creator';
import { EndpointData } from '../../server/types';
import { EndpointsListState } from '../reducers/endpoints_list';

// TODO: Type return value
export const actions = {
  serverReturnedEndpointListData: actionCreatorFactory<
    'serverReturnedEndpointListData',
    [EndpointsListState['data']]
  >('serverReturnedEndpointListData'),
  userFilteredEndpointListData: actionCreatorFactory<
    'userFilteredEndpointListData',
    [
      {
        filteredData: EndpointData[];
        isFiltered: boolean;
      }
    ]
  >('userFilteredEndpointListData'),
  userPaginatedOrSortedEndpointListTable: actionCreatorFactory<
    'userPaginatedOrSortedEndpointListTable',
    [
      {
        pageIndex: number;
        pageSize: number;
        sortField: string;
        sortDirection: Direction;
      }
    ]
  >('userPaginatedOrSortedEndpointListTable'),
};

export type EndpointListServerData = ReturnType<typeof actions.serverReturnedEndpointListData>;
export type EndpointListFilteredData = ReturnType<typeof actions.userFilteredEndpointListData>;
export type EndpointListPageAndSortedData = ReturnType<
  typeof actions.userPaginatedOrSortedEndpointListTable
>;

export type EndpointListActions =
  | EndpointListServerData
  | EndpointListFilteredData
  | EndpointListPageAndSortedData;
