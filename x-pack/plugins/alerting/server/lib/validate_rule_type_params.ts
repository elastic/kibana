/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RuleTypeParams, RuleTypeParamsValidator } from '../types';

export function validateRuleTypeParams<Params extends RuleTypeParams>(
  params: Record<string, unknown>,
  validator?: RuleTypeParamsValidator<Params>
): Params {
  if (!validator) {
    return params as Params;
  }

  try {
    return validator.validate(params);
  } catch (err) {
    throw Boom.badRequest(`params invalid: ${err.message}`);
  }
}
