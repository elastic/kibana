/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { mockHistory } from '../../__mocks__';
jest.mock('../kibana', () => ({
  KibanaLogic: { values: { history: mockHistory } },
}));

import { FlashMessagesLogic, mountFlashMessagesLogic, IFlashMessage } from './';

describe('FlashMessagesLogic', () => {
  const mount = () => mountFlashMessagesLogic();

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  it('has default values', () => {
    mount();
    expect(FlashMessagesLogic.values).toEqual({
      messages: [],
      queuedMessages: [],
      historyListener: expect.any(Function),
    });
  });

  describe('setFlashMessages()', () => {
    it('sets an array of messages', () => {
      const messages: IFlashMessage[] = [
        { type: 'success', message: 'Hello world!!' },
        { type: 'error', message: 'Whoa nelly!', description: 'Uh oh' },
        { type: 'info', message: 'Everything is fine, nothing is ruined' },
      ];

      mount();
      FlashMessagesLogic.actions.setFlashMessages(messages);

      expect(FlashMessagesLogic.values.messages).toEqual(messages);
    });

    it('automatically converts to an array if a single message obj is passed in', () => {
      const message = { type: 'success', message: 'I turn into an array!' } as IFlashMessage;

      mount();
      FlashMessagesLogic.actions.setFlashMessages(message);

      expect(FlashMessagesLogic.values.messages).toEqual([message]);
    });
  });

  describe('clearFlashMessages()', () => {
    it('sets messages back to an empty array', () => {
      mount();
      FlashMessagesLogic.actions.setFlashMessages('test' as any);
      FlashMessagesLogic.actions.clearFlashMessages();

      expect(FlashMessagesLogic.values.messages).toEqual([]);
    });
  });

  describe('setQueuedMessages()', () => {
    it('sets an array of messages', () => {
      const queuedMessage: IFlashMessage = { type: 'error', message: 'You deleted a thing' };

      mount();
      FlashMessagesLogic.actions.setQueuedMessages(queuedMessage);

      expect(FlashMessagesLogic.values.queuedMessages).toEqual([queuedMessage]);
    });
  });

  describe('clearQueuedMessages()', () => {
    it('sets queued messages back to an empty array', () => {
      mount();
      FlashMessagesLogic.actions.setQueuedMessages('test' as any);
      FlashMessagesLogic.actions.clearQueuedMessages();

      expect(FlashMessagesLogic.values.queuedMessages).toEqual([]);
    });
  });

  describe('history listener logic', () => {
    describe('setHistoryListener()', () => {
      it('sets the historyListener value', () => {
        mount();
        FlashMessagesLogic.actions.setHistoryListener('test' as any);

        expect(FlashMessagesLogic.values.historyListener).toEqual('test');
      });
    });

    describe('on mount', () => {
      it('listens for history changes and clears messages on change', () => {
        mount();
        expect(mockHistory.listen).toHaveBeenCalled();

        FlashMessagesLogic.actions.setQueuedMessages(['queuedMessages'] as any);
        jest.spyOn(FlashMessagesLogic.actions, 'clearFlashMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'setFlashMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'clearQueuedMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'setHistoryListener');

        const mockHistoryChange = (mockHistory.listen.mock.calls[0] as any)[0];
        mockHistoryChange();
        expect(FlashMessagesLogic.actions.clearFlashMessages).toHaveBeenCalled();
        expect(FlashMessagesLogic.actions.setFlashMessages).toHaveBeenCalledWith([
          'queuedMessages',
        ]);
        expect(FlashMessagesLogic.actions.clearQueuedMessages).toHaveBeenCalled();
      });
    });

    describe('on unmount', () => {
      it('removes history listener', () => {
        const mockUnlistener = jest.fn();
        mockHistory.listen.mockReturnValueOnce(mockUnlistener);

        const unmount = mount();
        unmount();

        expect(mockUnlistener).toHaveBeenCalled();
      });

      it('does not crash if no listener exists', () => {
        const unmount = mount();
        FlashMessagesLogic.actions.setHistoryListener(null as any);
        unmount();
      });
    });
  });
});
