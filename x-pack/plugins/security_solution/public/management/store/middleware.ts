/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  substateMiddlewareFactory,
  SecuritySubPluginMiddlewareFactory,
  State,
} from '../../common/store';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE,
} from '../common/constants';
import { policyDetailsMiddlewareFactory } from '../pages/policy/store/policy_details';
import { endpointMiddlewareFactory } from '../pages/endpoint_hosts/store/middleware';
import { eventFiltersPageMiddlewareFactory } from '../pages/event_filters/store/middleware';

type ManagementSubStateKey = keyof State[typeof MANAGEMENT_STORE_GLOBAL_NAMESPACE];

const createSubStateSelector =
  <K extends ManagementSubStateKey>(namespace: K) =>
  (state: State) =>
    state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][namespace];

export const managementMiddlewareFactory: SecuritySubPluginMiddlewareFactory = (
  coreStart,
  depsStart
) => {
  return [
    substateMiddlewareFactory(
      createSubStateSelector(MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE),
      policyDetailsMiddlewareFactory(coreStart, depsStart)
    ),
    substateMiddlewareFactory(
      createSubStateSelector(MANAGEMENT_STORE_ENDPOINTS_NAMESPACE),
      endpointMiddlewareFactory(coreStart, depsStart)
    ),

    substateMiddlewareFactory(
      createSubStateSelector(MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE),
      eventFiltersPageMiddlewareFactory(coreStart, depsStart)
    ),
  ];
};
