/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, createContext, useContext } from 'react';

interface WithoutChat {
  enabled: false;
}

interface WithChat {
  enabled: true;
  chatURL: string;
  identityJWT: string;
  userID: string;
  userEmail: string;
}

export type ChatService = WithChat | WithoutChat;

export interface CloudServices {
  chat: ChatService;
}

const ServicesContext = createContext<CloudServices>({ chat: { enabled: false } });

export const ServicesProvider: FC<CloudServices> = ({ children, ...services }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

/**
 * React hook for accessing the pre-wired `CloudServices`.
 */
export function useServices() {
  return useContext(ServicesContext);
}

export function useChat(): ChatService {
  const { chat } = useServices();
  return chat;
}
