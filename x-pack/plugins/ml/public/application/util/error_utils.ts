/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';

// Adding temporary types until Kibana ResponseError is updated
type MLResponseError =
  | ResponseError
  | {
      message: {
        msg: string;
      };
    }
  | { msg: string };

export const extractErrorMessage = (
  error: CustomHttpResponseOptions<MLResponseError> | undefined | string
): string | undefined => {
  // extract only the error message within the response error coming from Kibana, Elasticsearch, and our own ML messages
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
      if (typeof (error.body.message.msg === 'string')) {
        return error.body.message.msg;
      }
    }
    if (typeof error.body === 'object' && 'msg' in error.body) {
      if (typeof error.body.msg === 'string') {
        return error.body.msg;
      }
    }
  }
  return undefined;
};
