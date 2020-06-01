/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostResultList, HostInfo, GetHostPolicyResponse } from '../../../common/endpoint/types';
import { ServerApiError } from '../../common/types';

interface ServerReturnedHostList {
  type: 'serverReturnedHostList';
  payload: HostResultList;
}

interface ServerFailedToReturnHostList {
  type: 'serverFailedToReturnHostList';
  payload: ServerApiError;
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

interface ServerFailedToReturnHostPolicyResponse {
  type: 'serverFailedToReturnHostPolicyResponse';
  payload: ServerApiError;
}

export type HostAction =
  | ServerReturnedHostList
  | ServerFailedToReturnHostList
  | ServerReturnedHostDetails
  | ServerFailedToReturnHostDetails
  | ServerReturnedHostPolicyResponse
  | ServerFailedToReturnHostPolicyResponse;
