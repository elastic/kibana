/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData } from '../../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../../common/types';

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

export type PolicyListAction = ServerReturnedPolicyListData | ServerFailedToReturnPolicyListData;
