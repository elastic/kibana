/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeService } from '../action_type_service';

import { actionType as consoleLogActionType } from './console_log';

export function registerBuiltInActionTypes(actionTypeService: ActionTypeService) {
  actionTypeService.register(consoleLogActionType);
}
