/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, createContext, useContext } from 'react';
import type { History } from 'history';

export interface ChatConfig {
  chatURL: string;
  user: {
    jwt: string;
    id: string;
    email: string;
    trialEndDate: Date;
    kbnVersion: string;
    kbnBuildNum: number;
  };
}

export interface CloudChatServices {
  chat?: ChatConfig;
  history?: History;
}

const ServicesContext = createContext<CloudChatServices>({});

export const ServicesProvider: FC<CloudChatServices> = ({ children, ...services }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

/**
 * React hook for accessing the pre-wired `CloudChatServices`.
 */
export function useServices() {
  return useContext(ServicesContext);
}

export function useChat(): ChatConfig | undefined {
  const { chat } = useServices();
  return chat;
}

export function useHistory(): History | undefined {
  const { history } = useServices();
  return history;
}
