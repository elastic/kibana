/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchError } from '@kbn/core/public';
import Boom from '@hapi/boom';
import { isPopulatedObject } from '../../../../common/utils/object_utils';

export interface WrappedError {
  body: {
    attributes: {
      body: EsErrorBody;
    };
    message: Boom.Boom;
  };
  statusCode: number;
}

export interface EsErrorRootCause {
  type: string;
  reason: string;
  caused_by?: EsErrorRootCause;
  script?: string;
}

export interface EsErrorBody {
  error: {
    root_cause?: EsErrorRootCause[];
    caused_by?: EsErrorRootCause;
    type: string;
    reason: string;
  };
  status: number;
}

export interface DVResponseError {
  statusCode: number;
  error: string;
  message: string;
  attributes?: {
    body: EsErrorBody;
  };
}

export interface ErrorMessage {
  message: string;
}

export interface DVErrorObject {
  causedBy?: string;
  message: string;
  statusCode?: number;
  fullError?: EsErrorBody;
}

export interface DVHttpFetchError<T> extends HttpFetchError {
  body: T;
}

export type ErrorType =
  | WrappedError
  | DVHttpFetchError<DVResponseError>
  | EsErrorBody
  | Boom.Boom
  | string
  | undefined;

export function isEsErrorBody(error: any): error is EsErrorBody {
  return error && error.error?.reason !== undefined;
}

export function isErrorString(error: any): error is string {
  return typeof error === 'string';
}

export function isErrorMessage(error: any): error is ErrorMessage {
  return error && error.message !== undefined && typeof error.message === 'string';
}

export function isDVResponseError(error: any): error is DVResponseError {
  return typeof error.body === 'object' && 'message' in error.body;
}

export function isBoomError(error: any): error is Boom.Boom {
  return error?.isBoom === true;
}

export function isWrappedError(error: any): error is WrappedError {
  return error && isBoomError(error.body?.message) === true;
}

export const extractErrorProperties = (error: ErrorType): DVErrorObject => {
  // extract properties of the error object from within the response error
  // coming from Kibana, Elasticsearch, and our own DV messages

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
  if (isWrappedError(error)) {
    return error.body.message?.output?.payload;
  }

  if (isBoomError(error)) {
    return {
      message: error.output.payload.message,
      statusCode: error.output.payload.statusCode,
    };
  }

  if (error?.body === undefined && !error?.message) {
    return {
      message: '',
    };
  }

  if (typeof error.body === 'string') {
    return {
      message: error.body,
    };
  }

  if (isDVResponseError(error)) {
    if (
      typeof error.body.attributes === 'object' &&
      typeof error.body.attributes.body?.error?.reason === 'string'
    ) {
      const errObj: DVErrorObject = {
        message: error.body.attributes.body.error.reason,
        statusCode: error.body.statusCode,
        fullError: error.body.attributes.body,
      };
      if (
        typeof error.body.attributes.body.error.caused_by === 'object' &&
        (typeof error.body.attributes.body.error.caused_by?.reason === 'string' ||
          typeof error.body.attributes.body.error.caused_by?.caused_by?.reason === 'string')
      ) {
        errObj.causedBy =
          error.body.attributes.body.error.caused_by?.caused_by?.reason ||
          error.body.attributes.body.error.caused_by?.reason;
      }
      if (
        Array.isArray(error.body.attributes.body.error.root_cause) &&
        typeof error.body.attributes.body.error.root_cause[0] === 'object' &&
        isPopulatedObject(error.body.attributes.body.error.root_cause[0], ['script'])
      ) {
        errObj.causedBy = error.body.attributes.body.error.root_cause[0].script;
        errObj.message += `: '${error.body.attributes.body.error.root_cause[0].script}'`;
      }
      return errObj;
    } else {
      return {
        message: error.body.message,
        statusCode: error.body.statusCode,
      };
    }
  }

  if (isErrorMessage(error)) {
    return {
      message: error.message,
    };
  }

  // If all else fail return an empty message instead of JSON.stringify
  return {
    message: '',
  };
};
