/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../common/endpoint/types';
import { PolicyDetailsState, PolicyListState } from '../pages/policy/types';

/**
 * Redux store state for the Management section
 */
export interface ManagementState {
  policyDetails: Immutable<PolicyDetailsState>;
  policyList: Immutable<PolicyListState>;
}
