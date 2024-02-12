/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useEventDetails } from '../shared/hooks/use_event_details';
import { FlyoutError } from '../../shared/components/flyout_error';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
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
  /**
   * Index pattern for rule details
   */
  indexPattern: DataViewBase;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
}

export const PreviewPanelContext = createContext<PreviewPanelContext | undefined>(undefined);

export type PreviewPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<PreviewPanelProps['params']>;

export const PreviewPanelProvider = memo(
  ({ id, indexName, scopeId, ruleId, children }: PreviewPanelProviderProps) => {
    const { dataAsNestedObject, indexPattern, loading } = useEventDetails({
      eventId: id,
      indexName,
    });

    const contextValue = useMemo(
      () =>
        id && indexName && scopeId && dataAsNestedObject
          ? {
              eventId: id,
              indexName,
              scopeId,
              ruleId: ruleId ?? '',
              indexPattern,
              dataAsNestedObject,
            }
          : undefined,
      [id, indexName, scopeId, ruleId, indexPattern, dataAsNestedObject]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <PreviewPanelContext.Provider value={contextValue}>{children}</PreviewPanelContext.Provider>
    );
  }
);

PreviewPanelProvider.displayName = 'PreviewPanelProvider';

export const usePreviewPanelContext = (): PreviewPanelContext => {
  const contextValue = useContext(PreviewPanelContext);

  if (!contextValue) {
    throw new Error('PreviewPanelContext can only be used within PreviewPanelContext provider');
  }

  return contextValue;
};
