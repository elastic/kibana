/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData } from '../../types';

interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
  };
}

interface UserClickedPolicyDetailsSaveButton {
  type: 'userClickedPolicyDetailsSaveButton';
  payload: {
    policyId: string;
    policyData: { [key: string]: any }; // FIXME: define payload type
  };
}

export type PolicyDetailsAction =
  | ServerReturnedPolicyDetailsData
  | UserClickedPolicyDetailsSaveButton;
