/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAction } from '../../management/pages/endpoint_hosts/store/action';
import { PolicyListAction } from '../../management/pages/policy/store/policy_list';
import { PolicyDetailsAction } from '../../management/pages/policy/store/policy_details';
import { TrustedAppsPageAction } from '../../management/pages/trusted_apps/store/action';

export { appActions } from './app';
export { dragAndDropActions } from './drag_and_drop';
export { inputsActions } from './inputs';
export { sourcererActions } from './sourcerer';
import { RoutingAction } from './routing';

export type AppAction =
  | EndpointAction
  | RoutingAction
  | PolicyListAction
  | PolicyDetailsAction
  | TrustedAppsPageAction;
