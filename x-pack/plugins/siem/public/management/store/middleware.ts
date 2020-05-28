/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImmutableMultipleMiddlewareFactory, substateMiddlewareFactory } from '../../common/store';
import { policyListMiddlewareFactory } from '../pages/policy/store/policy_list';
import { policyDetailsMiddlewareFactory } from '../pages/policy/store/policy_details';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from '../common/constants';

// @ts-ignore
export const managementMiddlewareFactory: ImmutableMultipleMiddlewareFactory = (
  coreStart,
  depsStart
) => {
  return [
    substateMiddlewareFactory(
      globalState =>
        globalState[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_POLICY_LIST_NAMESPACE],
      policyListMiddlewareFactory(coreStart, depsStart)
    ),
    substateMiddlewareFactory(
      globalState =>
        globalState[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE],
      policyDetailsMiddlewareFactory(coreStart, depsStart)
    ),
  ];
};
