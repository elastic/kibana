/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError, ResponseHeaders } from 'kibana/server';
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

// Adding temporary types until Kibana ResponseError is updated

export interface BoomResponse {
  data: any;
  isBoom: boolean;
  isServer: boolean;
  output: {
    statusCode: number;
    payload: {
      statusCode: number;
      error: string;
      message: string;
    };
    headers: {};
  };
}
export type MLResponseError =
  | {
      message: {
        msg: string;
      };
    }
  | { msg: string };

export interface MLCustomHttpResponseOptions<
  T extends ResponseError | MLResponseError | BoomResponse
> {
  /** HTTP message to send to the client */
  body?: T;
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
  statusCode: number;
}

export const extractErrorMessage = (
  error:
    | MLCustomHttpResponseOptions<MLResponseError | ResponseError | BoomResponse>
    | undefined
    | string
): string => {
  // extract only the error message within the response error coming from Kibana, Elasticsearch, and our own ML messages

  if (typeof error === 'string') {
    return error;
  }
  if (error?.body === undefined) return '';

  if (typeof error.body === 'string') {
    return error.body;
  }
  if (
    typeof error.body === 'object' &&
    'output' in error.body &&
    error.body.output.payload.message
  ) {
    return error.body.output.payload.message;
  }

  if (typeof error.body === 'object' && 'msg' in error.body && typeof error.body.msg === 'string') {
    return error.body.msg;
  }

  if (typeof error.body === 'object' && 'message' in error.body) {
    if (typeof error.body.message === 'string') {
      return error.body.message;
    }
    if (!(error.body.message instanceof Error) && typeof (error.body.message.msg === 'string')) {
      return error.body.message.msg;
    }
  }
  // If all else fail return an empty message instead of JSON.stringify
  return '';
};
