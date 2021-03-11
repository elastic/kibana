/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from './object_utils';

export interface ErrorResponse {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes?: any;
  };
  name: string;
}

export function isErrorResponse(arg: unknown): arg is ErrorResponse {
  return isPopulatedObject(arg) && isPopulatedObject(arg.body) && arg?.body?.message !== undefined;
}

export function getErrorMessage(error: unknown) {
  if (isErrorResponse(error)) {
    return `${error.body.error}: ${error.body.message}`;
  }

  if (isPopulatedObject(error) && typeof error.message === 'string') {
    return error.message;
  }

  return JSON.stringify(error);
}
