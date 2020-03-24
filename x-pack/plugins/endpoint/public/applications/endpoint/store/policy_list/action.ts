/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData, ServerApiError } from '../../types';

interface ServerReturnedPolicyListData {
  type: 'serverReturnedPolicyListData';
  payload: {
    policyItems: PolicyData[];
    total: number;
    pageSize: number;
    pageIndex: number;
  };
}

interface ServerFailedToReturnPolicyListData {
  type: 'serverFailedToReturnPolicyListData';
  payload: ServerApiError;
}

interface UserPaginatedPolicyListTable {
  type: 'userPaginatedPolicyListTable';
  payload: {
    pageSize: number;
    pageIndex: number;
  };
}

export type PolicyListAction =
  | ServerReturnedPolicyListData
  | UserPaginatedPolicyListTable
  | ServerFailedToReturnPolicyListData;
