/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ActionType } from './types';

export function throwIfActionTypeParamsInvalid(
  actionType: ActionType,
  params: Record<string, any>
) {
  const validator = actionType.validate && actionType.validate.params;
  if (validator) {
    const { error } = validator.validate(params);
    if (error) {
      throw Boom.badRequest(`params invalid: ${error.message}`);
    }
  }
}
