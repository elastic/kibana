/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostListPagination, ServerApiError } from '../../types';
import { HostResultList, HostMetadata } from '../../../../../common/types';

interface ServerReturnedHostList {
  type: 'serverReturnedHostList';
  payload: HostResultList;
}

interface ServerReturnedHostDetails {
  type: 'serverReturnedHostDetails';
  payload: HostMetadata;
}

interface ServerFailedToReturnHostDetails {
  type: 'serverFailedToReturnHostDetails';
  payload: ServerApiError;
}

interface UserPaginatedHostList {
  type: 'userPaginatedHostList';
  payload: HostListPagination;
}

// Why is FakeActionWithNoPayload here, see: https://github.com/elastic/endpoint-app-team/issues/273
interface FakeActionWithNoPayload {
  type: 'fakeActionWithNoPayLoad';
}

export type HostAction =
  | ServerReturnedHostList
  | ServerReturnedHostDetails
  | ServerFailedToReturnHostDetails
  | UserPaginatedHostList
  | FakeActionWithNoPayload;
