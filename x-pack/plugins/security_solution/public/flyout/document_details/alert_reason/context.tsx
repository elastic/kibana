/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { FlyoutError, FlyoutLoading } from '@kbn/security-solution-common';
import { useEventDetails } from '../shared/hooks/use_event_details';
import type { AlertReasonPanelProps } from '.';

export interface AlertReasonPanelContext {
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
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
}

export const AlertReasonPanelContext = createContext<AlertReasonPanelContext | undefined>(
  undefined
);

export type AlertReasonPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<AlertReasonPanelProps['params']>;

export const AlertReasonPanelProvider = memo(
  ({ id, indexName, scopeId, children }: AlertReasonPanelProviderProps) => {
    const { dataAsNestedObject, loading } = useEventDetails({
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
              dataAsNestedObject,
            }
          : undefined,
      [id, indexName, scopeId, dataAsNestedObject]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <AlertReasonPanelContext.Provider value={contextValue}>
        {children}
      </AlertReasonPanelContext.Provider>
    );
  }
);

AlertReasonPanelProvider.displayName = 'AlertReasonPanelProvider';

export const useAlertReasonPanelContext = (): AlertReasonPanelContext => {
  const contextValue = useContext(AlertReasonPanelContext);

  if (!contextValue) {
    throw new Error(
      'AlertReasonPanelContext can only be used within AlertReasonPanelContext provider'
    );
  }

  return contextValue;
};
