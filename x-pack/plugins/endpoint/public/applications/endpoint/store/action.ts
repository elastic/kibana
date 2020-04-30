/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostAction } from './hosts';
import { AlertAction } from '../alerts/store';
import { RoutingAction } from './routing';
import { PolicyListAction } from './policy_list';
import { PolicyDetailsAction } from './policy_details';

/**
 * The entire set of redux actions recognized by our reducer.
 */
export type AppAction =
  | HostAction
  | AlertAction
  | RoutingAction
  | PolicyListAction
  | PolicyDetailsAction;
