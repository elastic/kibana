/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AlertTypeParams, AlertTypeParamsValidator } from '../types';

export function validateAlertTypeParams<Params extends AlertTypeParams>(
  params: Record<string, unknown>,
  validator?: AlertTypeParamsValidator<Params>
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
