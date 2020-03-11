/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData } from '../../types';

interface ServerReturnedPolicyListData {
  type: 'serverReturnedPolicyListData';
  payload: {
    policyItems: PolicyData[];
    total: number;
    pageSize: number;
    pageIndex: number;
  };
}

interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
  };
}

interface UserPaginatedPolicyListTable {
  type: 'userPaginatedPolicyListTable';
  payload: {
    pageSize: number;
    pageIndex: number;
  };
}

export type PolicyListAction = ServerReturnedPolicyListData | UserPaginatedPolicyListTable;
export type PolicyDetailsAction = ServerReturnedPolicyDetailsData;
