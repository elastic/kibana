/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { PreviewPanelProps } from '.';

export interface PreviewPanelContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Rule id if preview is rule details
   */
  ruleId: string;
}

export const PreviewPanelContext = createContext<PreviewPanelContext | undefined>(undefined);

export type PreviewPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<PreviewPanelProps['params']>

export const PreviewPanelProvider = ({
  id,
  indexName,
  scopeId,
  ruleId,
  children,
}: PreviewPanelProviderProps) => {
  const contextValue = useMemo(
    () =>
      id && indexName && scopeId
        ? {
            eventId: id,
            indexName,
            scopeId,
            ruleId: ruleId ?? '',
          }
        : undefined,
    [id, indexName, scopeId, ruleId]
  );

  return (
    <PreviewPanelContext.Provider value={contextValue}>{children}</PreviewPanelContext.Provider>
  );
};

export const usePreviewPanelContext = (): PreviewPanelContext => {
  const contextValue = useContext(PreviewPanelContext);

  if (!contextValue) {
    throw new Error('PreviewPanelContext can only be used within PreviewPanelContext provider');
  }

  return contextValue;
};
