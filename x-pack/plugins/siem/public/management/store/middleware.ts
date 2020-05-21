/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImmutableMiddlewareFactory, substateMiddlewareFactory } from '../../common/store';
import { ManagementState } from '../types';
import { policyListMiddlewareFactory } from '../pages/policy/store/policy_list';
import { policyDetailsMiddlewareFactory } from '../pages/policy/store/policy_details';
import {
  MANAGEMENT_GLOBAL_STORE_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from './constants';

export const managementMiddlewareFactory = (coreStart, depsStart) => {
  return [
    substateMiddlewareFactory(
      globalState =>
        globalState[MANAGEMENT_GLOBAL_STORE_NAMESPACE][MANAGEMENT_STORE_POLICY_LIST_NAMESPACE],
      policyListMiddlewareFactory(coreStart, depsStart)
    ),
    substateMiddlewareFactory(
      globalState =>
        globalState[MANAGEMENT_GLOBAL_STORE_NAMESPACE][MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE],
      policyDetailsMiddlewareFactory(coreStart, depsStart)
    ),
  ];
};
