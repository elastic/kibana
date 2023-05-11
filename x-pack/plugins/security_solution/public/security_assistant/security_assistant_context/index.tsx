/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import { omit } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import { updatePromptContexts } from './helpers';
import type {
  PromptContext,
  RegisterPromptContext,
  UnRegisterPromptContext,
} from '../prompt_context/types';
import type { SecurityAssistantUiSettings } from '../helpers';
import type { Conversation } from './types';

interface SecurityAssistantProviderProps {
  apiConfig: SecurityAssistantUiSettings;
  children: React.ReactNode;
  httpFetch: HttpHandler;
}

interface UseSecurityAssistantContext {
  apiConfig: SecurityAssistantUiSettings;
  httpFetch: HttpHandler;
  promptContexts: Record<string, PromptContext>;
  registerPromptContext: RegisterPromptContext;
  unRegisterPromptContext: UnRegisterPromptContext;
  conversationIds: string[];
  conversations: Record<string, Conversation>;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
}

export const SECURITY_ASSISTANT_UI_SETTING_KEY = 'securityAssistant';

const LOCAL_STORAGE_KEY = `securityAssistant`;

export const DEFAULT_CONVERSATION_STATE: Conversation = {
  id: 'default',
  messages: [],
  apiConfig: {
    openAI: {
      apiKey: '',
      baseUrl: '',
      model: '',
      prompt: '',
      temperature: 0.2,
    },
    virusTotal: {
      apiKey: '',
      baseUrl: '',
    },
  },
};

const SecurityAssistantContext = React.createContext<UseSecurityAssistantContext | undefined>(
  undefined
);

export const SecurityAssistantProvider: React.FC<SecurityAssistantProviderProps> = ({
  apiConfig,
  children,
  httpFetch,
}) => {
  /**
   * Prompt contexts are used to provide components a way to register and make their data available to the assistant.
   */
  const [promptContexts, setQueryContexts] = useState<Record<string, PromptContext>>({});

  const registerPromptContext: RegisterPromptContext = useCallback(
    (promptContext: PromptContext) => {
      setQueryContexts((prevPromptContexts) =>
        updatePromptContexts({
          prevPromptContexts,
          promptContext,
        })
      );
    },
    []
  );

  const unRegisterPromptContext: UnRegisterPromptContext = useCallback(
    (queryContextId: string) =>
      setQueryContexts((prevQueryContexts) => omit(queryContextId, prevQueryContexts)),
    []
  );

  /**
   * Conversation state/actions
   */
  const [conversations, setConversations] = useState<Record<string, Conversation>>({
    default: DEFAULT_CONVERSATION_STATE,
  });
  // const [conversationsMap, setConversationsMap] = useLocalStorage<Record<string, Conversation>>({
  //   defaultValue: { default: DEFAULT_CONVERSATION_STATE },
  //   key: LOCAL_STORAGE_KEY,
  //   isInvalidDefault: (valueFromStorage) => {
  //     return !valueFromStorage;
  //   },
  // });

  const value = useMemo(
    () => ({
      apiConfig,
      httpFetch,
      promptContexts,
      registerPromptContext,
      unRegisterPromptContext,
      setConversations,
      conversationIds: Object.keys(conversations).sort(),
      conversations,
    }),
    [
      apiConfig,
      httpFetch,
      promptContexts,
      registerPromptContext,
      unRegisterPromptContext,
      conversations,
    ]
  );

  return (
    <SecurityAssistantContext.Provider value={value}>{children}</SecurityAssistantContext.Provider>
  );
};

export const useSecurityAssistantContext = () => {
  const context = React.useContext(SecurityAssistantContext);

  if (context == null) {
    throw new Error('useSecurityAssistantContext must be used within a SecurityAssistantProvider');
  }

  return context;
};
