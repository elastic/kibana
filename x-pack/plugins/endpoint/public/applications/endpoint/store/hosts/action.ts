/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostListPagination, ServerApiError } from '../../types';
import { HostResultList, HostInfo } from '../../../../../common/types';

interface ServerReturnedHostList {
  type: 'serverReturnedHostList';
  payload: HostResultList;
}

interface ServerReturnedHostDetails {
  type: 'serverReturnedHostDetails';
  payload: HostInfo;
}

interface ServerFailedToReturnHostDetails {
  type: 'serverFailedToReturnHostDetails';
  payload: ServerApiError;
}

interface UserPaginatedHostList {
  type: 'userPaginatedHostList';
  payload: HostListPagination;
}

export type HostAction =
  | ServerReturnedHostList
  | ServerReturnedHostDetails
  | ServerFailedToReturnHostDetails
  | UserPaginatedHostList;
