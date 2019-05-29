/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from './types';

export function throwIfActionTypeConfigInvalid(
  actionType: ActionType,
  config: Record<string, any>
) {
  const validator = actionType.validate && actionType.validate.actionTypeConfig;
  if (validator) {
    const { error } = validator.validate(config);
    if (error) {
      throw error;
    }
  }
}
