/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicAction } from './dynamic_action';
import { Action } from '../../../../../src/legacy/core_plugins/embeddable_api/public';

export function isDynamicAction(
  action: Action | DynamicAction | { message: string; statusCode?: number }
): action is DynamicAction {
  return (action as DynamicAction).type !== undefined;
}
