/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlashMessagesLogic } from './';

export const setSuccessMessage = (message: string) => {
  FlashMessagesLogic.actions.setFlashMessages({
    type: 'success',
    message,
  });
};

export const setErrorMessage = (message: string) => {
  FlashMessagesLogic.actions.setFlashMessages({
    type: 'error',
    message,
  });
};

export const setQueuedSuccessMessage = (message: string) => {
  FlashMessagesLogic.actions.setQueuedMessages({
    type: 'success',
    message,
  });
};
