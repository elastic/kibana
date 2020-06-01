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
import { PolicyListState, PolicyDetailsState } from '../pages/policy/types';

export const managementMiddlewareFactory: SecuritySubPluginMiddlewareFactory = (
  coreStart,
  depsStart
) => {
  const listSelector = (state: State) => state.management.policyList;
  const detailSelector = (state: State) => state.management.policyDetails;

  return [
    substateMiddlewareFactory<PolicyListState>(
      listSelector,
      policyListMiddlewareFactory(coreStart, depsStart)
    ),
    substateMiddlewareFactory<PolicyDetailsState>(
      detailSelector,
      policyDetailsMiddlewareFactory(coreStart, depsStart)
    ),
  ];
};
