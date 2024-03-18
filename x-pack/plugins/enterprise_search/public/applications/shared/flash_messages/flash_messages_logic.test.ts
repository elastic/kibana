/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../__mocks__/kea_logic';
import { mockKibanaValues } from '../../__mocks__/kea_logic/kibana_logic.mock';

import { resetContext } from 'kea';

import type { NotificationsStart } from '@kbn/core-notifications-browser';

const { history } = mockKibanaValues;

import { FlashMessagesLogic } from './flash_messages_logic';
import { IFlashMessage } from './types';

describe('FlashMessagesLogic', () => {
  const { mount: mountFlashMessagesLogic, unmount: unmountFlashMessagesLogic } = new LogicMounter(
    FlashMessagesLogic
  );
  const mount = () => {
    resetContext({});
    mountFlashMessagesLogic(undefined, {
      notifications: {} as unknown as NotificationsStart,
    });
    return unmountFlashMessagesLogic;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has default values', () => {
    mount();
    expect(FlashMessagesLogic.values).toEqual({
      historyListener: expect.any(Function),
      messages: [],
      notifications: {},
      queuedMessages: [],
    });
  });

  describe('messages', () => {
    beforeAll(() => {
      mount();
    });

    describe('setFlashMessages', () => {
      it('sets an array of messages', () => {
        const messages: IFlashMessage[] = [
          { type: 'success', message: 'Hello world!!' },
          { type: 'error', message: 'Whoa nelly!', description: 'Uh oh' },
          { type: 'info', message: 'Everything is fine, nothing is ruined' },
        ];

        FlashMessagesLogic.actions.setFlashMessages(messages);

        expect(FlashMessagesLogic.values.messages).toEqual(messages);
      });

      it('automatically converts to an array if a single message obj is passed in', () => {
        const message = { type: 'success', message: 'I turn into an array!' } as IFlashMessage;

        FlashMessagesLogic.actions.setFlashMessages(message);

        expect(FlashMessagesLogic.values.messages).toEqual([message]);
      });
    });

    describe('clearFlashMessages', () => {
      it('resets messages back to an empty array', () => {
        FlashMessagesLogic.actions.clearFlashMessages();

        expect(FlashMessagesLogic.values.messages).toEqual([]);
      });
    });
  });

  describe('queuedMessages', () => {
    beforeAll(() => {
      mount();
    });

    describe('setQueuedMessages', () => {
      it('sets an array of messages', () => {
        const queuedMessage: IFlashMessage = { type: 'error', message: 'You deleted a thing' };

        FlashMessagesLogic.actions.setQueuedMessages(queuedMessage);

        expect(FlashMessagesLogic.values.queuedMessages).toEqual([queuedMessage]);
      });
    });

    describe('clearQueuedMessages', () => {
      it('resets queued messages back to an empty array', () => {
        FlashMessagesLogic.actions.clearQueuedMessages();

        expect(FlashMessagesLogic.values.queuedMessages).toEqual([]);
      });
    });
  });

  describe('history listener logic', () => {
    describe('setHistoryListener', () => {
      it('sets the historyListener value', () => {
        mount();
        FlashMessagesLogic.actions.setHistoryListener('test' as any);

        expect(FlashMessagesLogic.values.historyListener).toEqual('test');
      });
    });

    describe('on mount', () => {
      it('listens for history changes and clears messages on change', () => {
        mount();
        expect(history.listen).toHaveBeenCalled();

        FlashMessagesLogic.actions.setQueuedMessages(['queuedMessages'] as any);
        jest.spyOn(FlashMessagesLogic.actions, 'clearFlashMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'setFlashMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'clearQueuedMessages');
        jest.spyOn(FlashMessagesLogic.actions, 'setHistoryListener');

        const mockHistoryChange = (history.listen.mock.calls[0] as any)[0];
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
        history.listen.mockReturnValueOnce(mockUnlistener);

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
