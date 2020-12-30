/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { ReactNode } from 'react';

import { KibanaLogic } from '../kibana';

export interface IFlashMessage {
  type: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  description?: ReactNode;
}

interface FlashMessagesValues {
  messages: IFlashMessage[];
  queuedMessages: IFlashMessage[];
  historyListener: Function | null;
}
interface FlashMessagesActions {
  setFlashMessages(messages: IFlashMessage | IFlashMessage[]): { messages: IFlashMessage[] };
  clearFlashMessages(): void;
  setQueuedMessages(messages: IFlashMessage | IFlashMessage[]): { messages: IFlashMessage[] };
  clearQueuedMessages(): void;
  setHistoryListener(historyListener: Function): { historyListener: Function };
}

const convertToArray = (messages: IFlashMessage | IFlashMessage[]) =>
  !Array.isArray(messages) ? [messages] : messages;

export const FlashMessagesLogic = kea<MakeLogicType<FlashMessagesValues, FlashMessagesActions>>({
  path: ['enterprise_search', 'flash_messages_logic'],
  actions: {
    setFlashMessages: (messages) => ({ messages: convertToArray(messages) }),
    clearFlashMessages: () => null,
    setQueuedMessages: (messages) => ({ messages: convertToArray(messages) }),
    clearQueuedMessages: () => null,
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
  events: ({ values, actions }) => ({
    afterMount: () => {
      // On React Router navigation, clear previous flash messages and load any queued messages
      const unlisten = KibanaLogic.values.history.listen(() => {
        actions.clearFlashMessages();
        actions.setFlashMessages(values.queuedMessages);
        actions.clearQueuedMessages();
      });
      actions.setHistoryListener(unlisten);
    },
    beforeUnmount: () => {
      const { historyListener: removeHistoryListener } = values;
      if (removeHistoryListener) removeHistoryListener();
    },
  }),
});

/**
 * Mount/props helper
 */
export const mountFlashMessagesLogic = () => {
  const unmount = FlashMessagesLogic.mount();
  return unmount;
};
