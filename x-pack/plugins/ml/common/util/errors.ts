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
  | { msg: string; statusCode: number; response: string };

export interface MLCustomHttpResponseOptions<
  T extends ResponseError | MLResponseError | BoomResponse
> {
  /** HTTP message to send to the client */
  body?: T;
  /** HTTP Headers with additional information about response */
  headers?: ResponseHeaders;
  statusCode: number;
}

export interface MLErrorObject {
  message: string;
  fullErrorMessage?: string; // For use in a 'See full error' popover.
  statusCode?: number;
}

export const extractErrorProperties = (
  error:
    | MLCustomHttpResponseOptions<MLResponseError | ResponseError | BoomResponse>
    | string
    | undefined
): MLErrorObject => {
  // extract properties of the error object from within the response error
  // coming from Kibana, Elasticsearch, and our own ML messages
  let message = '';
  let fullErrorMessage;
  let statusCode;

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }
  if (error?.body === undefined) {
    return {
      message: '',
    };
  }

  if (typeof error.body === 'string') {
    return {
      message: error.body,
    };
  }
  if (
    typeof error.body === 'object' &&
    'output' in error.body &&
    error.body.output.payload.message
  ) {
    return {
      message: error.body.output.payload.message,
    };
  }

  if (
    typeof error.body === 'object' &&
    'response' in error.body &&
    typeof error.body.response === 'string'
  ) {
    const errorResponse = JSON.parse(error.body.response);
    if ('error' in errorResponse && typeof errorResponse === 'object') {
      const errorResponseError = errorResponse.error;
      if ('reason' in errorResponseError) {
        message = errorResponseError.reason;
      }
      if ('caused_by' in errorResponseError) {
        const causedByMessage = JSON.stringify(errorResponseError.caused_by);
        // Only add a fullErrorMessage if different to the message.
        if (causedByMessage !== message) {
          fullErrorMessage = causedByMessage;
        }
      }
      return {
        message,
        fullErrorMessage,
        statusCode: error.statusCode,
      };
    }
  }

  if (typeof error.body === 'object' && 'msg' in error.body && typeof error.body.msg === 'string') {
    return {
      message: error.body.msg,
    };
  }

  if (typeof error.body === 'object' && 'message' in error.body) {
    if (
      'attributes' in error.body &&
      typeof error.body.attributes === 'object' &&
      error.body.attributes.body?.status !== undefined
    ) {
      statusCode = error.body.attributes.body?.status;
    }

    if (typeof error.body.message === 'string') {
      return {
        message: error.body.message,
        statusCode,
      };
    }
    if (!(error.body.message instanceof Error) && typeof (error.body.message.msg === 'string')) {
      return {
        message: error.body.message.msg,
        statusCode,
      };
    }
  }

  // If all else fail return an empty message instead of JSON.stringify
  return {
    message: '',
  };
};

export const extractErrorMessage = (
  error:
    | MLCustomHttpResponseOptions<MLResponseError | ResponseError | BoomResponse>
    | undefined
    | string
): string => {
  // extract only the error message within the response error coming from Kibana, Elasticsearch, and our own ML messages
  const errorObj = extractErrorProperties(error);
  return errorObj.message;
};
