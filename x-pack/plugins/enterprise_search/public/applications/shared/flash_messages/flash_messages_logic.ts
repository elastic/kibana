/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { ReactNode } from 'react';
import { History } from 'history';

export interface IFlashMessage {
  type: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  description?: ReactNode;
}

export interface IFlashMessagesValues {
  messages: IFlashMessage[];
  queuedMessages: IFlashMessage[];
  historyListener: Function | null;
}
export interface IFlashMessagesActions {
  setFlashMessages(messages: IFlashMessage | IFlashMessage[]): { messages: IFlashMessage[] };
  clearFlashMessages(): void;
  setQueuedMessages(messages: IFlashMessage | IFlashMessage[]): { messages: IFlashMessage[] };
  clearQueuedMessages(): void;
  listenToHistory(history: History): History;
  setHistoryListener(historyListener: Function): { historyListener: Function };
}

const convertToArray = (messages: IFlashMessage | IFlashMessage[]) =>
  !Array.isArray(messages) ? [messages] : messages;

export const FlashMessagesLogic = kea<MakeLogicType<IFlashMessagesValues, IFlashMessagesActions>>({
  actions: {
    setFlashMessages: (messages) => ({ messages: convertToArray(messages) }),
    clearFlashMessages: () => null,
    setQueuedMessages: (messages) => ({ messages: convertToArray(messages) }),
    clearQueuedMessages: () => null,
    listenToHistory: (history) => history,
    setHistoryListener: (historyListener) => ({ historyListener }),
  },
  reducers: {
    messages: [
      [],
      {
        setFlashMessages: (_, { messages }) => messages,
        clearFlashMessages: () => [],
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
  },
  listeners: ({ values, actions }) => ({
    listenToHistory: (history) => {
      // On React Router navigation, clear previous flash messages and load any queued messages
      const unlisten = history.listen(() => {
        actions.clearFlashMessages();
        actions.setFlashMessages(values.queuedMessages);
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
});
