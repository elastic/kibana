/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostAction } from '../../endpoint_hosts/store/action';
import { AlertAction } from '../../endpoint_alerts/store/action';
import { PolicyListAction } from '../../endpoint_policy/store/policy_list';
import { PolicyDetailsAction } from '../../endpoint_policy/store/policy_details';

export { appActions } from './app';
export { dragAndDropActions } from './drag_and_drop';
export { inputsActions } from './inputs';
import { RoutingAction } from './routing';

export type AppAction =
  | HostAction
  | AlertAction
  | RoutingAction
  | PolicyListAction
  | PolicyDetailsAction;
