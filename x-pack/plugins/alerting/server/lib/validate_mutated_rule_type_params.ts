/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AlertTypeParams, AlertTypeParamsValidator } from '../types';

export function validateMutatedRuleTypeParams<Params extends AlertTypeParams>(
  params: Params,
  validator?: AlertTypeParamsValidator<Params>
): Params {
  if (!validator) {
    return params as Params;
  }

  try {
    if (validator.validateMutatedParams) {
      return validator.validateMutatedParams(params);
    }
    return params;
  } catch (err) {
    throw Boom.badRequest(`mutated params invalid: ${err.message}`);
  }
}
