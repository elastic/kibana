/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea } from 'kea';
import { ReactNode } from 'react';

import { IKeaLogic, TKeaReducers } from '../types';

export interface IFlashMessage {
  type: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  description?: ReactNode;
}

export interface IFlashMessagesLogicValues {
  messages: IFlashMessage[];
}
export interface IFlashMessagesLogicActions {
  setMessages(messages: IFlashMessage | IFlashMessage[]): void;
  clearMessages(): void;
}

export const FlashMessagesLogic = kea({
  actions: (): IFlashMessagesLogicActions => ({
    setMessages: (messages) => ({
      messages: !Array.isArray(messages) ? [messages] : messages,
    }),
    clearMessages: () => null,
  }),
  reducers: (): TKeaReducers<IFlashMessagesLogicValues, IFlashMessagesLogicActions> => ({
    messages: [
      [],
      {
        setMessages: (_, { messages }) => messages,
        clearMessages: () => [],
      },
    ],
  }),
}) as IKeaLogic<IFlashMessagesLogicValues, IFlashMessagesLogicActions>;
