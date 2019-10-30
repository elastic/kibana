/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { actionCreatorFactory } from '../lib/action_creator';

// TODO: Type return value
export const actions = {
  serverReturnedData: actionCreatorFactory<'serverReturnedData', [any]>('serverReturnedData'),
  userPaginatedOrSortedTable: actionCreatorFactory<
    'userPaginatedOrSortedTable',
    [
      {
        pageIndex: number;
        pageSize: number;
        sortField: string;
        sortDirection: Direction;
      }
    ]
  >('userPaginatedOrSortedTable'),
  userSelectedTableItems: actionCreatorFactory<'userSelectedTableItems', [object[]]>(
    'userSelectedTableItems'
  ),
  userClickedArchiveItems: actionCreatorFactory<'userClickedArchiveItems', [string[]]>(
    'userClickedArchiveItems'
  ),
  serverReturnedArchiveItems: actionCreatorFactory<'serverReturnedArchiveItems', []>(
    'serverReturnedArchiveItems'
  ),
};

export type AlertListAction =
  | ReturnType<typeof actions.serverReturnedData>
  | ReturnType<typeof actions.userPaginatedOrSortedTable>
  | ReturnType<typeof actions.userSelectedTableItems>
  | ReturnType<typeof actions.userClickedArchiveItems>;
