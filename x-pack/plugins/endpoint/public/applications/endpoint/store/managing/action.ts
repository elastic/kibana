/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementListPagination, ServerApiError } from '../../types';
import { EndpointResultList, EndpointMetadata } from '../../../../../common/types';

interface ServerReturnedManagementList {
  type: 'serverReturnedManagementList';
  payload: EndpointResultList;
}

interface ServerReturnedManagementDetails {
  type: 'serverReturnedManagementDetails';
  payload: EndpointMetadata;
}

interface ServerFailedToReturnManagementDetails {
  type: 'serverFailedToReturnManagementDetails';
  payload: ServerApiError;
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
  | ServerReturnedManagementDetails
  | ServerFailedToReturnManagementDetails
  | UserExitedManagementList
  | UserPaginatedManagementList;
