/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchError } from 'kibana/public';
import Boom from 'boom';

export interface EsErrorRootCause {
  type: string;
  reason: string;
}

export interface EsErrorBody {
  error: {
    root_cause?: EsErrorRootCause[];
    type: string;
    reason: string;
  };
  status: number;
}

export interface MLResponseError {
  statusCode: number;
  error: string;
  message: string;
  attributes?: {
    body: EsErrorBody;
  };
}

export interface MLHttpFetchError<T> extends HttpFetchError {
  body: T;
}

export type ErrorType = MLHttpFetchError<MLResponseError> | EsErrorBody | Boom | string | undefined;

function isEsErrorBody(error: any): error is EsErrorBody {
  return error && error.error?.reason !== undefined;
}

function isErrorString(error: any): error is string {
  return typeof error === 'string';
}

function isMLResponseError(error: any): error is MLResponseError {
  return typeof error.body === 'object' && 'message' in error.body;
}

function isBoomError(error: any): error is Boom {
  return error.isBoom === true;
}

export interface MLErrorObject {
  message: string;
  statusCode?: number;
  fullError?: EsErrorBody;
}

export const extractErrorProperties = (error: ErrorType): MLErrorObject => {
  // extract properties of the error object from within the response error
  // coming from Kibana, Elasticsearch, and our own ML messages

  // some responses contain raw es errors as part of a bulk response
  // e.g. if some jobs fail the action in a bulk request
  if (isEsErrorBody(error)) {
    return {
      message: error.error.reason,
      statusCode: error.status,
      fullError: error,
    };
  }

  if (isErrorString(error)) {
    return {
      message: error,
    };
  }

  if (isBoomError(error)) {
    return {
      message: error.output.payload.message,
      statusCode: error.output.payload.statusCode,
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

  if (isMLResponseError(error)) {
    if (
      typeof error.body.attributes === 'object' &&
      typeof error.body.attributes.body?.error?.reason === 'string'
    ) {
      return {
        message: error.body.attributes.body.error.reason,
        statusCode: error.body.statusCode,
        fullError: error.body.attributes.body,
      };
    } else {
      return {
        message: error.body.message,
        statusCode: error.body.statusCode,
      };
    }
  }

  // If all else fail return an empty message instead of JSON.stringify
  return {
    message: '',
  };
};

export const extractErrorMessage = (error: ErrorType): string => {
  // extract only the error message within the response error coming from Kibana, Elasticsearch, and our own ML messages
  const errorObj = extractErrorProperties(error);
  return errorObj.message;
};
