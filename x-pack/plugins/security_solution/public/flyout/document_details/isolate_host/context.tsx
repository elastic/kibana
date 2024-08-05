/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import React, { createContext, memo, useContext, useMemo } from 'react';

import { FlyoutError, FlyoutLoading } from '@kbn/security-solution-common';
import { useEventDetails } from '../shared/hooks/use_event_details';
import type { IsolateHostPanelProps } from '.';

export interface IsolateHostPanelContext {
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
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Isolate action, either 'isolateHost' or 'unisolateHost'
   */
  isolateAction: 'isolateHost' | 'unisolateHost';
}

export const IsolateHostPanelContext = createContext<IsolateHostPanelContext | undefined>(
  undefined
);

export type IsolateHostPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<IsolateHostPanelProps['params']>;

export const IsolateHostPanelProvider = memo(
  ({ id, indexName, scopeId, isolateAction, children }: IsolateHostPanelProviderProps) => {
    const { dataFormattedForFieldBrowser, loading } = useEventDetails({ eventId: id, indexName });

    const contextValue = useMemo(
      () =>
        id && indexName && scopeId && isolateAction && dataFormattedForFieldBrowser
          ? {
              eventId: id,
              indexName,
              scopeId,
              dataFormattedForFieldBrowser,
              isolateAction,
            }
          : undefined,
      [id, indexName, scopeId, dataFormattedForFieldBrowser, isolateAction]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <IsolateHostPanelContext.Provider value={contextValue}>
        {children}
      </IsolateHostPanelContext.Provider>
    );
  }
);

IsolateHostPanelProvider.displayName = 'IsolateHostPanelProvider';

export const useIsolateHostPanelContext = (): IsolateHostPanelContext => {
  const contextValue = useContext(IsolateHostPanelContext);

  if (!contextValue) {
    throw new Error(
      'IsolateHostPanelContext can only be used within IsolateHostPanelContext provider'
    );
  }

  return contextValue;
};
