/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostListPagination, ServerApiError } from '../../types';
import { EndpointResultList, EndpointMetadata } from '../../../../../common/types';

interface ServerReturnedHostList {
  type: 'serverReturnedHostList';
  payload: EndpointResultList;
}

interface ServerReturnedHostDetails {
  type: 'serverReturnedHostDetails';
  payload: EndpointMetadata;
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
