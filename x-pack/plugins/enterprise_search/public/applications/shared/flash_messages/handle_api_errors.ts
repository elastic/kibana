/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpResponse } from 'src/core/public';

import { FlashMessagesLogic, IFlashMessage } from './';

/**
 * The API errors we are handling can come from one of two ways:
 *  - When our http calls recieve a response containing an error code, such as a 404 or 500
 *  - Our own JS while handling a successful response
 *
 * In the first case, if it is a purposeful error (like a 404) we will receive an
 * `errors` property in the response's data, which will contain messages we can
 * display to the user.
 */
interface IErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  attributes: {
    errors: string[];
  };
}
interface IOptions {
  isQueued?: boolean;
}

/**
 * Converts API/HTTP errors into user-facing Flash Messages
 */
export const flashAPIErrors = (
  error: HttpResponse<IErrorResponse>,
  { isQueued }: IOptions = {}
) => {
  const defaultErrorMessage = 'An unexpected error occurred';

  const errorFlashMessages: IFlashMessage[] = Array.isArray(error?.body?.attributes?.errors)
    ? error.body!.attributes.errors.map((message) => ({ type: 'error', message }))
    : [{ type: 'error', message: error?.body?.message || defaultErrorMessage }];

  if (isQueued) {
    FlashMessagesLogic.actions.setQueuedMessages(errorFlashMessages);
  } else {
    FlashMessagesLogic.actions.setFlashMessages(errorFlashMessages);
  }

  // If this was a programming error or a failed request (such as a CORS) error,
  // we rethrow the error so it shows up in the developer console
  if (!error?.body?.message) {
    throw error;
  }
};
