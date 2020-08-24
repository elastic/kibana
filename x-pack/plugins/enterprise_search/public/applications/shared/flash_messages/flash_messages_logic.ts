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
  historyListener: Function | null;
}
export interface IFlashMessagesLogicActions {
  setMessages(messages: IFlashMessage | IFlashMessage[]): void;
  clearMessages(): void;
  listenToHistory(history: History): void;
  setHistoryListener(historyListener: Function): void;
}

export const FlashMessagesLogic = kea({
  actions: (): IFlashMessagesLogicActions => ({
    setMessages: (messages) => ({
      messages: !Array.isArray(messages) ? [messages] : messages,
    }),
    clearMessages: () => null,
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
    historyListener: [
      null,
      {
        setHistoryListener: (_, { historyListener }) => historyListener,
      },
    ],
  }),
  listeners: ({ values, actions }): Partial<IFlashMessagesLogicActions> => ({
    listenToHistory: (history) => {
      // On React Router navigation, clear flash messages
      const unlisten = history.listen(() => {
        actions.clearMessages();
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
