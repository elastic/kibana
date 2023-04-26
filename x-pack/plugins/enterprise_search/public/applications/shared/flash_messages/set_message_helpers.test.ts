/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/kea_logic/kibana_logic.mock';

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

    describe('without optional args', () => {
      beforeEach(() => {
        jest.spyOn(global.Date, 'now').mockReturnValueOnce(1234567890);
      });

      it('flashSuccessToast', () => {
        flashSuccessToast('You did a thing!');

        expect(FlashMessagesLogic.values.toastMessages).toEqual([
          {
            color: 'success',
            iconType: 'check',
            title: 'You did a thing!',
            id: 'successToast-1234567890',
          },
        ]);
      });

      it('flashErrorToast', () => {
        flashErrorToast('Something went wrong');

        expect(FlashMessagesLogic.values.toastMessages).toEqual([
          {
            color: 'danger',
            iconType: 'error',
            title: 'Something went wrong',
            id: 'errorToast-1234567890',
          },
        ]);
      });
    });

    describe('with optional args', () => {
      it('flashSuccessToast', () => {
        flashSuccessToast('You did a thing!', {
          text: '<button>View new thing</button>',
          toastLifeTimeMs: 50,
          id: 'customId',
        });

        expect(FlashMessagesLogic.values.toastMessages).toEqual([
          {
            color: 'success',
            iconType: 'check',
            title: 'You did a thing!',
            text: '<button>View new thing</button>',
            toastLifeTimeMs: 50,
            id: 'customId',
          },
        ]);
      });

      it('flashErrorToast', () => {
        flashErrorToast('Something went wrong', {
          text: "Here's some helpful advice on what to do",
          toastLifeTimeMs: 50000,
          id: 'specificErrorId',
        });

        expect(FlashMessagesLogic.values.toastMessages).toEqual([
          {
            color: 'danger',
            iconType: 'error',
            title: 'Something went wrong',
            text: "Here's some helpful advice on what to do",
            toastLifeTimeMs: 50000,
            id: 'specificErrorId',
          },
        ]);
      });
    });
  });
});
