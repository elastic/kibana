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
    queuedMessages: [],
    historyListener: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  it('has expected default values', () => {
    FlashMessagesLogic.mount();
    expect(FlashMessagesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('setFlashMessages()', () => {
    it('sets an array of messages', () => {
      const messages: IFlashMessage[] = [
        { type: 'success', message: 'Hello world!!' },
        { type: 'error', message: 'Whoa nelly!', description: 'Uh oh' },
        { type: 'info', message: 'Everything is fine, nothing is ruined' },
      ];

      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setFlashMessages(messages);

      expect(FlashMessagesLogic.values.messages).toEqual(messages);
    });

    it('automatically converts to an array if a single message obj is passed in', () => {
      const message = { type: 'success', message: 'I turn into an array!' } as IFlashMessage;

      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setFlashMessages(message);

      expect(FlashMessagesLogic.values.messages).toEqual([message]);
    });
  });

  describe('clearFlashMessages()', () => {
    it('sets messages back to an empty array', () => {
      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setFlashMessages('test' as any);
      FlashMessagesLogic.actions.clearFlashMessages();

      expect(FlashMessagesLogic.values.messages).toEqual([]);
    });
  });

  describe('setQueuedMessages()', () => {
    it('sets an array of messages', () => {
      const queuedMessage: IFlashMessage = { type: 'error', message: 'You deleted a thing' };

      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setQueuedMessages(queuedMessage);

      expect(FlashMessagesLogic.values.queuedMessages).toEqual([queuedMessage]);
    });
  });

  describe('clearQueuedMessages()', () => {
    it('sets queued messages back to an empty array', () => {
      FlashMessagesLogic.mount();
      FlashMessagesLogic.actions.setQueuedMessages('test' as any);
      FlashMessagesLogic.actions.clearQueuedMessages();

      expect(FlashMessagesLogic.values.queuedMessages).toEqual([]);
    });
  });

  describe('history listener logic', () => {
    describe('setHistoryListener()', () => {
      it('sets the historyListener value', () => {
        FlashMessagesLogic.mount();
        FlashMessagesLogic.actions.setHistoryListener('test' as any);

        expect(FlashMessagesLogic.values.historyListener).toEqual('test');
      });
    });

    describe('listenToHistory()', () => {
      it('listens for history changes and clears messages on change', () => {
        FlashMessagesLogic.mount();
        FlashMessagesLogic.actions.setQueuedMessages(['queuedMessages'] as any);
        jest.spyOn(FlashMessagesLogic.actions, 'clearFlashMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'setFlashMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'clearQueuedMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'setHistoryListener');

        const mockListener = jest.fn(() => jest.fn());
        const history = { listen: mockListener } as any;
        FlashMessagesLogic.actions.listenToHistory(history);

        expect(mockListener).toHaveBeenCalled();
        expect(FlashMessagesLogic.actions.setHistoryListener).toHaveBeenCalled();

        const mockHistoryChange = (mockListener.mock.calls[0] as any)[0];
        mockHistoryChange();
        expect(FlashMessagesLogic.actions.clearFlashMessages).toHaveBeenCalled();
        expect(FlashMessagesLogic.actions.setFlashMessages).toHaveBeenCalledWith([
          'queuedMessages',
        ]);
        expect(FlashMessagesLogic.actions.clearQueuedMessages).toHaveBeenCalled();
      });
    });

    describe('beforeUnmount', () => {
      it('removes history listener on unmount', () => {
        const mockUnlistener = jest.fn();
        const unmount = FlashMessagesLogic.mount();

        FlashMessagesLogic.actions.setHistoryListener(mockUnlistener);
        unmount();

        expect(mockUnlistener).toHaveBeenCalled();
      });

      it('does not crash if no listener exists', () => {
        const unmount = FlashMessagesLogic.mount();
        unmount();
      });
    });
  });
});
