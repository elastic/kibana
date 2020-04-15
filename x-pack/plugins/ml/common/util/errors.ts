/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isErrorResponse } from '../types/errors';

export function getErrorMessage(error: any) {
  if (isErrorResponse(error)) {
    return `${error.body.error}: ${error.body.message}`;
  }

  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }

  return JSON.stringify(error);
}
