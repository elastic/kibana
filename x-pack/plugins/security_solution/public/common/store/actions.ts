/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAction } from '../../management/pages/endpoint_hosts/store/action';
import type { PolicyDetailsAction } from '../../management/pages/policy/store/policy_details';

export { appActions } from './app';
export { dragAndDropActions } from './drag_and_drop';
export { inputsActions } from './inputs';
export { sourcererActions } from './sourcerer';
import type { RoutingAction } from './routing';

export type AppAction = EndpointAction | RoutingAction | PolicyDetailsAction;
