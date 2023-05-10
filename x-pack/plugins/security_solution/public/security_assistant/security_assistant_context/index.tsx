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

interface SecurityAssistantProviderProps {
  children: React.ReactNode;
  httpFetch: HttpHandler;
}

interface UseSecurityAssistantContext {
  httpFetch: HttpHandler;
  promptContexts: Record<string, PromptContext>;
  registerPromptContext: RegisterPromptContext;
  unRegisterPromptContext: UnRegisterPromptContext;
}

const SecurityAssistantContext = React.createContext<UseSecurityAssistantContext | undefined>(
  undefined
);

export const SecurityAssistantProvider: React.FC<SecurityAssistantProviderProps> = ({
  children,
  httpFetch,
}) => {
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

  const value = useMemo(
    () => ({
      httpFetch,
      promptContexts,
      registerPromptContext,
      unRegisterPromptContext,
    }),
    [httpFetch, promptContexts, registerPromptContext, unRegisterPromptContext]
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
