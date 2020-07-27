/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  substateMiddlewareFactory,
  SecuritySubPluginMiddlewareFactory,
  State,
} from '../../common/store';
import { policyListMiddlewareFactory } from '../pages/policy/store/policy_list';
import { policyDetailsMiddlewareFactory } from '../pages/policy/store/policy_details';
import {
  MANAGEMENT_STORE_HOSTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from '../common/constants';
import { hostMiddlewareFactory } from '../pages/endpoint_hosts/store/middleware';

const policyListSelector = (state: State) =>
  state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_POLICY_LIST_NAMESPACE];
const policyDetailsSelector = (state: State) =>
  state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE];
const endpointsSelector = (state: State) =>
  state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_HOSTS_NAMESPACE];

export const managementMiddlewareFactory: SecuritySubPluginMiddlewareFactory = (
  coreStart,
  depsStart
) => {
  return [
    substateMiddlewareFactory(
      policyListSelector,
      policyListMiddlewareFactory(coreStart, depsStart)
    ),
    substateMiddlewareFactory(
      policyDetailsSelector,
      policyDetailsMiddlewareFactory(coreStart, depsStart)
    ),
    substateMiddlewareFactory(endpointsSelector, hostMiddlewareFactory(coreStart, depsStart)),
  ];
};
