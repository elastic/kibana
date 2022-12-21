/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { FlashMessages, Toasts } from './flash_messages';
export { FlashMessagesLogic, mountFlashMessagesLogic } from './flash_messages_logic';
export type { IFlashMessage } from './types';
export { flashAPIErrors, toastAPIErrors } from './handle_api_errors';
export {
  setSuccessMessage,
  setErrorMessage,
  setQueuedSuccessMessage,
  setQueuedErrorMessage,
  flashSuccessToast,
  flashErrorToast,
  clearFlashMessages,
} from './set_message_helpers';
