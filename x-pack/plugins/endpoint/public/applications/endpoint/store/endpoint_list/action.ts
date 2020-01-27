/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointListData, EndpointListPagination } from './types';

interface ServerReturnedEndpointList {
  type: 'serverReturnedEndpointList';
  payload: EndpointListData;
}

interface UserEnteredEndpointListPage {
  type: 'userEnteredEndpointListPage';
}

interface UserExitedEndpointListPage {
  type: 'userExitedEndpointListPage';
}

interface UserPaginatedEndpointListTable {
  type: 'userPaginatedEndpointListTable';
  payload: EndpointListPagination;
}

export type EndpointListAction =
  | ServerReturnedEndpointList
  | UserEnteredEndpointListPage
  | UserExitedEndpointListPage
  | UserPaginatedEndpointListTable;
