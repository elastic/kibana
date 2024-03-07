/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Validator } from '@kbn/ml-form-utils/validator';

import { requiredErrorMessage, stringNotValidErrorMessage } from './messages';

export const stringValidator: Validator = (value, isOptional = true) => {
  if (typeof value !== 'string') {
    return [stringNotValidErrorMessage];
  }

  if (value.length === 0 && !isOptional) {
    return [requiredErrorMessage];
  }

  return [];
};
