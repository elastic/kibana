/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData, PolicyDetailsConfig } from '../../types';

interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
  };
}

interface UserChangedPolicyConfig {
  type: 'userChangedPolicyConfig';
  payload: {
    policyConfig: PolicyDetailsConfig;
  };
}

export type PolicyDetailsAction = ServerReturnedPolicyDetailsData | UserChangedPolicyConfig;
