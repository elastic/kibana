/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { FlashMessagesLogic, IFlashMessage } from './flash_messages_logic';

describe('FlashMessagesLogic', () => {
  const DEFAULT_VALUES = {
    messages: [],
  };

  beforeEach(() => {
    resetContext({});
  });

  it('has expected default values', () => {
    FlashMessagesLogic.mount();
    expect(FlashMessagesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('setMessages()', () => {
    it('sets an array of messages', () => {
      const messages = [
        { type: 'success', message: 'Hello world!!' },
        { type: 'error', message: 'Whoa nelly!', description: 'Uh oh' },
        { type: 'info', message: 'Everything is fine, nothing is ruined' },
      ] as IFlashMessage[];

      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setMessages(messages);

      expect(FlashMessagesLogic.values.messages).toEqual(messages);
    });

    it('automatically converts to an array if a single message obj is passed in', () => {
      const message = { type: 'success', message: 'I turn into an array!' } as IFlashMessage;

      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setMessages(message);

      expect(FlashMessagesLogic.values.messages).toEqual([message]);
    });
  });

  describe('clearMessages()', () => {
    it('sets messages back to an empty array', () => {
      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setMessages('test' as any);
      FlashMessagesLogic.actions.clearMessages();

      expect(FlashMessagesLogic.values.messages).toEqual([]);
    });
  });
});
