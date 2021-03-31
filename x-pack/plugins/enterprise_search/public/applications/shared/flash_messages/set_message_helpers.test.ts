/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/kibana_logic.mock';

import { FlashMessagesLogic } from './flash_messages_logic';
import {
  setSuccessMessage,
  setErrorMessage,
  setQueuedSuccessMessage,
  setQueuedErrorMessage,
  clearFlashMessages,
  flashSuccessToast,
  flashErrorToast,
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

  describe('toast helpers', () => {
    afterEach(() => {
      FlashMessagesLogic.actions.clearToastMessages();
    });

    it('flashSuccessToast', () => {
      flashSuccessToast({
        id: 'successToastMessage',
        title: 'You did a thing!',
        toastLifeTimeMs: 500,
      });

      expect(FlashMessagesLogic.values.toastMessages).toEqual([
        {
          color: 'success',
          iconType: 'check',
          id: 'successToastMessage',
          title: 'You did a thing!',
          toastLifeTimeMs: 500,
        },
      ]);
    });

    it('flashErrorToast', () => {
      flashErrorToast({
        id: 'errorToastMessage',
        title: 'Something went wrong',
        text: "Here's some helpful advice on what to do",
      });

      expect(FlashMessagesLogic.values.toastMessages).toEqual([
        {
          color: 'danger',
          iconType: 'alert',
          id: 'errorToastMessage',
          title: 'Something went wrong',
          text: "Here's some helpful advice on what to do",
        },
      ]);
    });
  });
});
