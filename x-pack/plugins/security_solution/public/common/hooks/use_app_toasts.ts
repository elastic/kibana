/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useMemo } from 'react';
import { isString } from 'lodash/fp';
import {
  AppError,
  isAppError,
  isKibanaError,
  isSecurityAppError,
} from '@kbn/securitysolution-t-grid';

import { IEsError, isEsError } from '@kbn/data-plugin/public';

import { ErrorToastOptions, ToastsStart, Toast } from '@kbn/core/public';
import { useToasts } from '../lib/kibana';

export type UseAppToasts = Pick<ToastsStart, 'addSuccess' | 'addWarning'> & {
  api: ToastsStart;
  addError: (error: unknown, options: ErrorToastOptions) => Toast;
};

/**
 * This gives a better presentation of error data sent from the API (both general platform errors and app-specific errors).
 * This uses platform's new Toasts service to prevent modal/toast z-index collision issues.
 * This fixes some issues you can see with re-rendering since using a class such as notifications.toasts.
 * This also has an adapter and transform for detecting if a bsearch's EsError is present and then adapts that to the
 * Kibana error toaster model so that the network error message will be shown rather than a stack trace.
 */
export const useAppToasts = (): UseAppToasts => {
  const toasts = useToasts();
  const addError = useRef(toasts.addError.bind(toasts)).current;
  const addSuccess = useRef(toasts.addSuccess.bind(toasts)).current;
  const addWarning = useRef(toasts.addWarning.bind(toasts)).current;

  const _addError = useCallback(
    (error: unknown, options: ErrorToastOptions) => {
      const adaptedError = errorToErrorStackAdapter(error);
      return addError(adaptedError, options);
    },
    [addError]
  );

  return useMemo(
    () => ({ api: toasts, addError: _addError, addSuccess, addWarning }),
    [_addError, addSuccess, addWarning, toasts]
  );
};

/**
 * Given an error of one type vs. another type this tries to adapt
 * the best it can to the existing error toaster which parses the .stack
 * as its error when you click the button to show the full error message.
 * @param error The error to adapt to.
 * @returns The adapted toaster error message.
 */
export const errorToErrorStackAdapter = (error: unknown): Error => {
  if (error != null && isEsError(error)) {
    return esErrorToErrorStack(error);
  } else if (isAppError(error)) {
    return appErrorToErrorStack(error);
  } else if (error instanceof Error) {
    return errorToErrorStack(error);
  } else {
    return unknownToErrorStack(error);
  }
};

/**
 * See this file, we are not allowed to import files such as es_error.
 * So instead we say maybe err is on there so that we can unwrap it and get
 * our status code from it if possible within the error in our function.
 * src/plugins/data/public/search/errors/es_error.tsx
 */
export type MaybeESError = IEsError & { err?: Record<string, unknown> };

/**
 * This attempts its best to map between an IEsError which comes from bsearch to a error_toaster
 * See the file: src/core/public/notifications/toasts/error_toast.tsx
 *
 * NOTE: This is brittle at the moment from bsearch and the hope is that better support between
 * the error message and formatting of bsearch and the error_toast.tsx from Kibana core will be
 * supported in the future. However, for now, this is _hopefully_ temporary.
 *
 * Also see the file:
 * x-pack/plugins/security_solution/public/app/home/setup.tsx
 *
 * Where this same technique of overriding and changing the stack is occurring.
 */
export const esErrorToErrorStack = (error: IEsError & MaybeESError): Error => {
  const maybeUnWrapped = error.err != null ? error.err : error;
  const statusCode =
    error.err?.statusCode != null
      ? `(${error.err.statusCode})`
      : error.statusCode != null
      ? `(${error.statusCode})`
      : '';
  const stringifiedError = getStringifiedStack(maybeUnWrapped);
  const adaptedError = new Error(`${error.attributes?.reason ?? error.message} ${statusCode}`);
  adaptedError.name = error.attributes?.reason ?? error.message;
  if (stringifiedError != null) {
    adaptedError.stack = stringifiedError;
  }
  return adaptedError;
};

/**
 * This attempts its best to map between a Kibana application error which can come from backend
 * REST API's that are typically of a particular format and form.
 *
 * The existing error_toaster code tries to consolidate network and software stack traces but really
 * here and our toasters we are using them for network response errors so we can troubleshoot things
 * as quick as possible.
 *
 * We override and use error.stack to be able to give _full_ network responses regardless of if they
 * are from Kibana or if they are from elasticSearch since sometimes Kibana errors might wrap the errors.
 *
 * Sometimes the errors are wrapped from io-ts, Kibana Schema or something else and we want to show
 * as full error messages as we can.
 */
export const appErrorToErrorStack = (error: AppError): Error => {
  const statusCode = isKibanaError(error)
    ? `(${error.body.statusCode})`
    : isSecurityAppError(error)
    ? `(${error.body.status_code})`
    : '';
  const stringifiedError = getStringifiedStack(error);
  const adaptedError = new Error(
    `${String(error.body.message).trim() !== '' ? error.body.message : error.message} ${statusCode}`
  );
  // Note although all the Typescript typings say that error.name is a string and exists, we still can encounter an undefined so we
  // do an extra guard here and default to empty string if it is undefined
  adaptedError.name = error.name != null ? error.name : '';
  if (stringifiedError != null) {
    adaptedError.stack = stringifiedError;
  }
  return adaptedError;
};

/**
 * Takes an error and tries to stringify it and use that as the stack for the error toaster
 * @param error The error to convert into a message
 * @returns The exception error to return back
 */
export const errorToErrorStack = (error: Error): Error => {
  const stringifiedError = getStringifiedStack(error);
  const adaptedError = new Error(error.message);
  adaptedError.name = error.name;
  if (stringifiedError != null) {
    adaptedError.stack = stringifiedError;
  }
  return adaptedError;
};

/**
 * Last ditch effort to take something unknown which could be a string, number,
 * anything. This usually should not be called but just in case we do try our
 * best to stringify it and give a message, name, and replace the stack of it.
 * @param error The unknown error to convert into a message
 * @returns The exception error to return back
 */
export const unknownToErrorStack = (error: unknown): Error => {
  const stringifiedError = getStringifiedStack(error);
  const message = isString(error)
    ? error
    : error instanceof Object && stringifiedError != null
    ? stringifiedError
    : String(error);
  const adaptedError = new Error(message);
  adaptedError.name = message;
  if (stringifiedError != null) {
    adaptedError.stack = stringifiedError;
  }
  return adaptedError;
};

/**
 * Stringifies the error. However, since Errors can JSON.stringify into empty objects this will
 * use a replacer to push those as enumerable properties so we can stringify them.
 * @param error The error to get a string representation of
 * @returns The string representation of the error
 */
export const getStringifiedStack = (error: unknown): string | undefined => {
  try {
    return JSON.stringify(
      error,
      (_, value) => {
        const enumerable = convertErrorToEnumerable(value);
        if (isEmptyObjectWhenStringified(enumerable)) {
          return undefined;
        } else {
          return enumerable;
        }
      },
      2
    );
  } catch (err) {
    return undefined;
  }
};

/**
 * Converts an error if this is an error to have enumerable so it can stringified
 * @param error The error which might not have enumerable properties.
 * @returns Enumerable error
 */
export const convertErrorToEnumerable = (error: unknown): unknown => {
  if (error instanceof Error) {
    return {
      ...error,
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else {
    return error;
  }
};

/**
 * If the object strings into an empty object we shouldn't show it as it doesn't
 * add value and sometimes different people/frameworks attach req,res,request,response
 * objects which don't stringify into anything or can have circular references.
 * @param item  The item to see if we are empty or have a circular reference error with.
 * @returns True if this is a good object to stringify, otherwise false
 */
export const isEmptyObjectWhenStringified = (item: unknown): boolean => {
  if (item instanceof Object) {
    try {
      return JSON.stringify(item) === '{}';
    } catch (_) {
      // Do nothing, return false if we have a circular reference or other oddness.
      return false;
    }
  } else {
    return false;
  }
};
