/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementPagination } from '../../types';
import { EndpointResultList } from '../../../../../common/types';

interface ServerReturnedEndpointList {
  type: 'serverReturnedEndpointList';
  payload: EndpointResultList;
}

interface UserExitedEndpointListPage {
  type: 'userExitedEndpointListPage';
}

interface UserPaginatedEndpointListTable {
  type: 'userPaginatedEndpointListTable';
  payload: ManagementPagination;
}

export type EndpointListAction =
  | ServerReturnedEndpointList
  | UserExitedEndpointListPage
  | UserPaginatedEndpointListTable;
