/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchError } from '@kbn/core/public';
import Boom from '@hapi/boom';

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

export interface MLResponseError {
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

export interface MLErrorObject {
  causedBy?: string;
  message: string;
  statusCode?: number;
  fullError?: EsErrorBody;
}

export interface MLHttpFetchError<T> extends HttpFetchError {
  body: T;
}

export type ErrorType =
  | MLHttpFetchError<MLResponseError>
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

export function isMLResponseError(error: any): error is MLResponseError {
  return typeof error.body === 'object' && 'message' in error.body;
}

export function isBoomError(error: any): error is Boom.Boom {
  return error?.isBoom === true;
}
