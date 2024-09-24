/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { InferenceTaskEventBase, InferenceTaskEventType } from './inference_task';

export enum InferenceTaskErrorCode {
  internalError = 'internalError',
  requestError = 'requestError',
}

export class InferenceTaskError<
  TCode extends string,
  TMeta extends Record<string, any> | undefined
> extends Error {
  constructor(public code: TCode, message: string, public meta: TMeta) {
    super(message);
  }

  toJSON(): InferenceTaskErrorEvent {
    return {
      type: InferenceTaskEventType.error,
      error: {
        code: this.code,
        message: this.message,
        meta: this.meta,
      },
    };
  }
}

export type InferenceTaskErrorEvent = InferenceTaskEventBase<InferenceTaskEventType.error> & {
  error: {
    code: string;
    message: string;
    meta?: Record<string, any>;
  };
};

export type InferenceTaskInternalError = InferenceTaskError<
  InferenceTaskErrorCode.internalError,
  Record<string, any>
>;

export type InferenceTaskRequestError = InferenceTaskError<
  InferenceTaskErrorCode.requestError,
  { status: number }
>;

export function createInferenceInternalError(
  message: string = i18n.translate('xpack.inference.internalError', {
    defaultMessage: 'An internal error occurred',
  }),
  meta?: Record<string, any>
): InferenceTaskInternalError {
  return new InferenceTaskError(InferenceTaskErrorCode.internalError, message, meta ?? {});
}

export function createInferenceRequestError(
  message: string,
  status: number
): InferenceTaskRequestError {
  return new InferenceTaskError(InferenceTaskErrorCode.requestError, message, {
    status,
  });
}

export function isInferenceError(
  error: unknown
): error is InferenceTaskError<string, Record<string, any> | undefined> {
  return error instanceof InferenceTaskError;
}

export function isInferenceInternalError(error: unknown): error is InferenceTaskInternalError {
  return isInferenceError(error) && error.code === InferenceTaskErrorCode.internalError;
}

export function isInferenceRequestError(error: unknown): error is InferenceTaskRequestError {
  return isInferenceError(error) && error.code === InferenceTaskErrorCode.requestError;
}
