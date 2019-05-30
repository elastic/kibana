/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../action_type_registry';

import { actionType as serverLogActionType } from './server_log';

export function registerBuiltInActionTypes(actionTypeRegistry: ActionTypeRegistry) {
  actionTypeRegistry.register(serverLogActionType);
}
