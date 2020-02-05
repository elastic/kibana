/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ServerReturnedPolicyListData {
  type: 'serverReturnedPolicyListData';
  payload: {
    policyItems: object[];
    // tbd...
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
