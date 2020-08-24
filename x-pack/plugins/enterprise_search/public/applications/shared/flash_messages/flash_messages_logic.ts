/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea } from 'kea';
import { ReactNode } from 'react';
import { History } from 'history';

import { IKeaLogic, TKeaReducers, IKeaParams } from '../types';

export interface IFlashMessage {
  type: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  description?: ReactNode;
}

export interface IFlashMessagesLogicValues {
  messages: IFlashMessage[];
  queuedMessages: IFlashMessage[];
  historyListener: Function | null;
}
export interface IFlashMessagesLogicActions {
  setMessages(messages: IFlashMessage | IFlashMessage[]): void;
  clearMessages(): void;
  setQueuedMessages(messages: IFlashMessage | IFlashMessage[]): void;
  clearQueuedMessages(): void;
  listenToHistory(history: History): void;
  setHistoryListener(historyListener: Function): void;
}

const convertToArray = (messages: IFlashMessage | IFlashMessage[]) =>
  !Array.isArray(messages) ? [messages] : messages;

export const FlashMessagesLogic = kea({
  actions: (): IFlashMessagesLogicActions => ({
    setMessages: (messages) => ({ messages: convertToArray(messages) }),
    clearMessages: () => null,
    setQueuedMessages: (messages) => ({ messages: convertToArray(messages) }),
    clearQueuedMessages: () => null,
    listenToHistory: (history) => history,
    setHistoryListener: (historyListener) => ({ historyListener }),
  }),
  reducers: (): TKeaReducers<IFlashMessagesLogicValues, IFlashMessagesLogicActions> => ({
    messages: [
      [],
      {
        setMessages: (_, { messages }) => messages,
        clearMessages: () => [],
      },
    ],
    queuedMessages: [
      [],
      {
        setQueuedMessages: (_, { messages }) => messages,
        clearQueuedMessages: () => [],
      },
    ],
    historyListener: [
      null,
      {
        setHistoryListener: (_, { historyListener }) => historyListener,
      },
    ],
  }),
  listeners: ({ values, actions }): Partial<IFlashMessagesLogicActions> => ({
    listenToHistory: (history) => {
      // On React Router navigation, clear previous flash messages and load any queued messages
      const unlisten = history.listen(() => {
        actions.clearMessages();
        actions.setMessages(values.queuedMessages);
        actions.clearQueuedMessages();
      });
      actions.setHistoryListener(unlisten);
    },
  }),
  events: ({ values }) => ({
    beforeUnmount: () => {
      const { historyListener: removeHistoryListener } = values;
      if (removeHistoryListener) removeHistoryListener();
    },
  }),
} as IKeaParams<IFlashMessagesLogicValues, IFlashMessagesLogicActions>) as IKeaLogic<
  IFlashMessagesLogicValues,
  IFlashMessagesLogicActions
>;
