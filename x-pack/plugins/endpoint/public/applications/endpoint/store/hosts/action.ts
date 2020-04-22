/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostListPagination, ServerApiError } from '../../types';
import { HostResultList, HostInfo, GetHostPolicyResponse } from '../../../../../common/types';

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

interface ServerReturnedHostPolicyResponse {
  type: 'serverReturnedHostPolicyResponse';
  payload: GetHostPolicyResponse;
}
interface UserPaginatedHostList {
  type: 'userPaginatedHostList';
  payload: HostListPagination;
}

export type HostAction =
  | ServerReturnedHostList
  | ServerReturnedHostDetails
  | ServerFailedToReturnHostDetails
  | ServerReturnedHostPolicyResponse
  | UserPaginatedHostList;
