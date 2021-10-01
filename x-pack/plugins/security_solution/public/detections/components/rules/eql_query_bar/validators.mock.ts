/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidationError } from '../../../../shared_imports';
import { ERROR_CODES } from './validators';

export const getEqlResponseError = (): ValidationError => ({
  code: ERROR_CODES.FAILED_REQUEST,
  message: 'something went wrong',
});

export const getEqlValidationError = (): ValidationError => ({
  code: ERROR_CODES.INVALID_EQL,
  messages: ['line 1: WRONG\nline 2: ALSO WRONG'],
  message: '',
});
