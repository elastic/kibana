/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { Tag } from '@kbn/saved-objects-tagging-plugin/common';
import { useFetchSecurityTags } from '../containers/use_fetch_security_tags';

export interface TagReference extends Tag {
  type: string;
}
export interface DashboardContextType {
  securityTags: TagReference[] | null;
}

const DashboardContext = React.createContext<DashboardContextType | null>({ securityTags: null });

export const DashboardContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { tags, isLoading } = useFetchSecurityTags();
  const securityTags = isLoading || !tags ? null : tags;

  return <DashboardContext.Provider value={{ securityTags }}>{children}</DashboardContext.Provider>;
};

export const useDashboardContext = () => {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardContextProvider');
  }
  return context;
};

export const useSecurityTags = () => {
  const context = useDashboardContext();
  return context.securityTags;
};
