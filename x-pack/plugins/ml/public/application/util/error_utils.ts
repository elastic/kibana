/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';

export const extractErrorMessage = (
  error: CustomHttpResponseOptions<ResponseError> | undefined | string
): string | undefined => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.body) {
    if (typeof error.body === 'string') {
      return error.body;
    }
    if (typeof error.body === 'object' && 'message' in error.body) {
      if (typeof error.body.message === 'string') {
        return error.body.message;
      }
      // @ts-ignore
      if (typeof (error.body.message?.msg === 'string')) {
        // @ts-ignore
        return error.body.message?.msg;
      }
    }
  }
  return undefined;
};
