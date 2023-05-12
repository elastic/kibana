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
import { useLocalStorage } from '../../common/components/local_storage';
import { ALL_QUERIES_CONVERSATION } from '../use_conversation/sample_conversations';

export interface ShowAssistantOverlayProps {
  showOverlay: boolean;
  promptContextId?: string;
  conversationId?: string;
}

type ShowAssistantOverlay = ({
  showOverlay,
  promptContextId,
  conversationId,
}: ShowAssistantOverlayProps) => void;
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
  showAssistantOverlay: ShowAssistantOverlay;
  setShowAssistantOverlay: (showAssistantOverlay: ShowAssistantOverlay) => void;
}

export const SECURITY_ASSISTANT_UI_SETTING_KEY = 'securityAssistant';

const LOCAL_STORAGE_KEY = `securityAssistant`;

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
  const [conversations, setConversations] = useLocalStorage<Record<string, Conversation>>({
    defaultValue: { default: ALL_QUERIES_CONVERSATION.default },
    key: LOCAL_STORAGE_KEY,
    isInvalidDefault: (valueFromStorage) => {
      return !valueFromStorage;
    },
  });

  /**
   * Global Assistant Overlay actions
   */
  const [showAssistantOverlay, setShowAssistantOverlay] = useState<ShowAssistantOverlay>(
    (showAssistant) => {}
  );

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
      showAssistantOverlay,
      setShowAssistantOverlay,
    }),
    [
      apiConfig,
      httpFetch,
      promptContexts,
      registerPromptContext,
      unRegisterPromptContext,
      setConversations,
      conversations,
      showAssistantOverlay,
      setShowAssistantOverlay,
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
