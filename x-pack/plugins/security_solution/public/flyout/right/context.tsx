/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { RightPanelProps } from '.';

export interface RightPanelContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
}

export const RightPanelContext = createContext<RightPanelContext | undefined>(undefined);

export type RightPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<RightPanelProps['params']>;

export const RightPanelProvider = ({ id, indexName, children }: RightPanelProviderProps) => {
  const contextValue = {
    eventId: id as string,
    indexName: indexName as string,
  };

  return <RightPanelContext.Provider value={contextValue}>{children}</RightPanelContext.Provider>;
};

export const useRightPanelContext = (): RightPanelContext => {
  const contextValue = useContext(RightPanelContext);

  if (!contextValue) {
    throw new Error('RightPanelContext can only be used within RightPanelContext provider');
  }

  return contextValue;
};
