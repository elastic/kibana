/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { createContext, useContext, useRef, useCallback } from 'react';

import type { IntegrationsAppBrowseRouteState } from '../../../types';
import { useIntraAppState } from '../../../hooks';

interface AgentPolicyContextValue {
  getId(): string | undefined;
}

const AgentPolicyContext = createContext<AgentPolicyContextValue>({ getId: () => undefined });

export const AgentPolicyContextProvider: FunctionComponent<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const maybeState = useIntraAppState<undefined | IntegrationsAppBrowseRouteState>();
  const ref = useRef<undefined | string>(maybeState?.forAgentPolicyId);

  const getId = useCallback(() => {
    return ref.current;
  }, []);
  return <AgentPolicyContext.Provider value={{ getId }}>{children}</AgentPolicyContext.Provider>;
};

export const useAgentPolicyContext = () => {
  const ctx = useContext(AgentPolicyContext);
  if (!ctx) {
    throw new Error('useAgentPolicyContext can only be used inside of AgentPolicyContextProvider');
  }
  return ctx;
};
