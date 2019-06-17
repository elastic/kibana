/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ActionType } from './types';

export function validateActionTypeConfig<T extends Record<string, any>>(
  actionType: ActionType,
  config: T
): T {
  const validator = actionType.validate && actionType.validate.config;
  if (!validator) {
    return config;
  }
  const { error, value } = validator.validate(config);
  if (error) {
    throw Boom.badRequest(`actionTypeConfig invalid: ${error.message}`);
  }
  return value;
}
