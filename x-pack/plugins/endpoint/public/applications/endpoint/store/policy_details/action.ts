/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData, PolicyConfig } from '../../types';

interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
  };
}

/**
 * When users change a policy via forms, this action is dispatched with a payload that modifies the configuration of a cloned policy config.
 */
interface UserChangedPolicyConfig {
  type: 'userChangedPolicyConfig';
  payload: {
    policyConfig: PolicyConfig;
  };
}

export type PolicyDetailsAction = ServerReturnedPolicyDetailsData | UserChangedPolicyConfig;
