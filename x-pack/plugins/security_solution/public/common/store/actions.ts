/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostAction } from '../../management/pages/endpoint_hosts/store/action';
import { PolicyListAction } from '../../management/pages/policy/store/policy_list';
import { PolicyDetailsAction } from '../../management/pages/policy/store/policy_details';

export { appActions } from './app';
export { dragAndDropActions } from './drag_and_drop';
export { inputsActions } from './inputs';
import { RoutingAction } from './routing';

export type AppAction = HostAction | RoutingAction | PolicyListAction | PolicyDetailsAction;
