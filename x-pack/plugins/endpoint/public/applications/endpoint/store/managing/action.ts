/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementListPagination } from '../../types';
import { EndpointResultList } from '../../../../../common/types';

interface ServerReturnedManagementList {
  type: 'serverReturnedManagementList';
  payload: EndpointResultList;
}

interface UserExitedManagementList {
  type: 'userExitedManagementList';
}

interface UserPaginatedManagementList {
  type: 'userPaginatedManagementList';
  payload: ManagementListPagination;
}

export type ManagementAction =
  | ServerReturnedManagementList
  | UserExitedManagementList
  | UserPaginatedManagementList;
