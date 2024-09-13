/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, createContext, useContext, PropsWithChildren } from 'react';
import type { ChatVariant } from '../../common/types';

export interface ChatConfig {
  chatURL: string;
  chatVariant: ChatVariant;
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
}

const ServicesContext = createContext<CloudChatServices>({});

export const ServicesProvider: FC<PropsWithChildren<CloudChatServices>> = ({
  children,
  ...services
}) => <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;

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
