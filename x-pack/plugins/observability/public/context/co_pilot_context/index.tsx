/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useMemo, useState } from 'react';
import {
  CoPilotChatViewType,
  CoPilotWithUiService,
  type CoPilotService,
} from '../../typings/co_pilot';

export const CoPilotContext = createContext<CoPilotWithUiService | undefined>(undefined);

export function CoPilotContextProvider({
  value,
  children,
}: {
  value: CoPilotService;
  children: React.ReactElement;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const [viewType, setViewType] = useState(CoPilotChatViewType.List);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const [promptInput, setPromptInput] = useState('');

  const coPilotWithUi = useMemo<CoPilotWithUiService | undefined>(() => {
    return value
      ? {
          ...value,
          openConversation: (nextConversationId: string) => {
            setIsOpen(true);
            setViewType(CoPilotChatViewType.Conversation);
            setConversationId(nextConversationId);
          },
          showList: () => {
            setIsOpen(true);
            setConversationId(undefined);
            setViewType(CoPilotChatViewType.List);
          },
          openNewConversation: (prompt) => {
            setIsOpen(true);
            setViewType(CoPilotChatViewType.Conversation);
            setConversationId(undefined);
            setPromptInput(prompt);
          },
          close: () => {
            setIsOpen(false);
          },
          get isOpen() {
            return isOpen;
          },
          get promptInput() {
            return promptInput;
          },
          get viewType() {
            return viewType;
          },
          get conversationId() {
            return conversationId;
          },
        }
      : value;
  }, [value, isOpen, promptInput, viewType, conversationId]);

  return <CoPilotContext.Provider value={coPilotWithUi}>{children}</CoPilotContext.Provider>;
}
