/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kibana_logic.mock';

import { FlashMessagesLogic } from './flash_messages_logic';
import {
  setSuccessMessage,
  setErrorMessage,
  setQueuedSuccessMessage,
  setQueuedErrorMessage,
  clearFlashMessages,
} from './set_message_helpers';

describe('Flash Message Helpers', () => {
  const message = 'I am a message';

  beforeEach(() => {
    FlashMessagesLogic.mount();
  });

  it('setSuccessMessage()', () => {
    setSuccessMessage(message);

    expect(FlashMessagesLogic.values.messages).toEqual([
      {
        message,
        type: 'success',
      },
    ]);
  });

  it('setErrorMessage()', () => {
    setErrorMessage(message);

    expect(FlashMessagesLogic.values.messages).toEqual([
      {
        message,
        type: 'error',
      },
    ]);
  });

  it('setQueuedSuccessMessage()', () => {
    setQueuedSuccessMessage(message);

    expect(FlashMessagesLogic.values.queuedMessages).toEqual([
      {
        message,
        type: 'success',
      },
    ]);
  });

  it('setQueuedErrorMessage()', () => {
    setQueuedErrorMessage(message);

    expect(FlashMessagesLogic.values.queuedMessages).toEqual([
      {
        message,
        type: 'error',
      },
    ]);
  });

  it('clearFlashMessages()', () => {
    clearFlashMessages();

    expect(FlashMessagesLogic.values.messages).toEqual([]);
  });
});
