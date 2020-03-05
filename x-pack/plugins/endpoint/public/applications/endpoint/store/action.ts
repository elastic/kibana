/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementAction } from './managing';
import { AlertAction } from './alerts';
import { RoutingAction } from './routing';
import { PolicyListAction } from './policy_list';

export type AppAction = ManagementAction | AlertAction | RoutingAction | PolicyListAction;
