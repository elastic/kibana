/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpResponse } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { FlashMessagesLogic } from './flash_messages_logic';
import { flashErrorToast } from './set_message_helpers';
import { IFlashMessage } from './types';

/**
 * The API errors we are handling can come from one of two ways:
 *  - When our http calls receive a response containing an error code, such as a 404 or 500
 *  - Our own JS while handling a successful response
 *
 * In the first case, if it is a purposeful error (like a 404) we will receive an
 * `errors` property in the response's data, which will contain messages we can
 * display to the user.
 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  attributes: {
    errors: string[];
  };
}
interface Options {
  isQueued?: boolean;
}

export const defaultErrorMessage = i18n.translate(
  'xpack.enterpriseSearch.shared.flashMessages.defaultErrorMessage',
  {
    defaultMessage: 'An unexpected error occurred',
  }
);

export const getErrorsFromHttpResponse = (response: HttpResponse<ErrorResponse>) => {
  return Array.isArray(response?.body?.attributes?.errors)
    ? response.body!.attributes.errors
    : [response?.body?.message || defaultErrorMessage];
};

/**
 * Converts API/HTTP errors into user-facing Flash Messages
 */
export const flashAPIErrors = (
  response: HttpResponse<ErrorResponse>,
  { isQueued }: Options = {}
) => {
  const errorFlashMessages: IFlashMessage[] = getErrorsFromHttpResponse(response).map(
    (message) => ({ type: 'error', message })
  );

  if (isQueued) {
    FlashMessagesLogic.actions.setQueuedMessages(errorFlashMessages);
  } else {
    FlashMessagesLogic.actions.setFlashMessages(errorFlashMessages);
  }

  // If this was a programming error or a failed request (such as a CORS) error,
  // we rethrow the error so it shows up in the developer console
  if (!response?.body?.message) {
    throw response;
  }
};

export const toastAPIErrors = (response: HttpResponse<ErrorResponse>) => {
  const messages = getErrorsFromHttpResponse(response);

  for (const message of messages) {
    flashErrorToast(message);
  }
  // If this was a programming error or a failed request (such as a CORS) error,
  // we rethrow the error so it shows up in the developer console
  if (!response?.body?.message) {
    throw response;
  }
};
