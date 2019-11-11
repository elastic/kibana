/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { actionCreatorFactory } from '../lib/action_creator';

// TODO: Type return value
export const actions = {
  serverReturnedEndpointListData: actionCreatorFactory<'serverReturnedEndpointListData', [any]>(
    'serverReturnedEndpointListData'
  ),
  userFilteredEndpointListData: actionCreatorFactory<'userFilteredEndpointListData', [any]>(
    'userFilteredEndpointListData'
  ),
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
  // userSelectedTableItems: actionCreatorFactory<'userSelectedTableItems', [object[]]>(
  //   'userSelectedTableItems'
  // ),
  // userClickedArchiveItems: actionCreatorFactory<'userClickedArchiveItems', [string[]]>(
  //   'userClickedArchiveItems'
  // ),
  // serverReturnedArchiveItems: actionCreatorFactory<'serverReturnedArchiveItems', []>(
  //   'serverReturnedArchiveItems'
  // ),
};

export type EndpointListActions =
  | ReturnType<typeof actions.serverReturnedEndpointListData>
  | ReturnType<typeof actions.userFilteredEndpointListData>
  | ReturnType<typeof actions.userPaginatedOrSortedEndpointListTable>;
// | ReturnType<typeof actions.userSelectedTableItems>
// | ReturnType<typeof actions.userClickedArchiveItems>;
