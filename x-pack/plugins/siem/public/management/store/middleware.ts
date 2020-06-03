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
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from '../common/constants';
import { hostMiddlewareFactory } from '../pages/endpoint_hosts/store';

export const managementMiddlewareFactory: SecuritySubPluginMiddlewareFactory = (
  coreStart,
  depsStart
) => {
  const listSelector = (state: State) => state.management.policyList;
  const detailSelector = (state: State) => state.management.policyDetails;

  return [
    substateMiddlewareFactory(listSelector, policyListMiddlewareFactory(coreStart, depsStart)),
    substateMiddlewareFactory(detailSelector, policyDetailsMiddlewareFactory(coreStart, depsStart)),
    substateMiddlewareFactory(
      (globalState) =>
        globalState[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_ENDPOINTS_NAMESPACE],
      hostMiddlewareFactory(coreStart, depsStart)
    ),
  ];
};
