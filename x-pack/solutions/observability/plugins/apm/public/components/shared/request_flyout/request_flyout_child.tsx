/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, Fragment, useCallback, useContext, useMemo, useState } from 'react';
import type { FailedCallBucket } from '@kbn/apm-api-shared';

/**
 * The single child flyout a request flyout level can have open at a time
 * (EUI allows one main + one child flyout per session).
 */
export type RequestFlyoutChild =
  | { kind: 'transaction'; name: string; transactionType: string }
  | { kind: 'operation'; spanName: string; dependencyName: string }
  | { kind: 'error'; bucket: FailedCallBucket }
  | { kind: 'resource'; resource: string };

export const getChildKey = (child: RequestFlyoutChild): string => {
  switch (child.kind) {
    case 'transaction':
      return `transaction:${child.name}:${child.transactionType}`;
    case 'operation':
      return `operation:${child.dependencyName}:${child.spanName}`;
    case 'error':
      return `error:${child.bucket.type}:${child.bucket.topErrorGroupId ?? child.bucket.topError}`;
    case 'resource':
      return `resource:${child.resource}`;
  }
};

interface RequestFlyoutChildContextValue {
  selectedChild: RequestFlyoutChild | null;
  /** Opens the child, or closes it when the same child is already open. */
  toggleChild: (child: RequestFlyoutChild) => void;
  closeChild: () => void;
  isChildSelected: (child: RequestFlyoutChild) => boolean;
}

const RequestFlyoutChildContext = createContext<RequestFlyoutChildContextValue | null>(null);

export function RequestFlyoutChildProvider({
  children,
  render,
}: {
  children: React.ReactNode;
  /** Renders the child flyout for the current selection. */
  render: (child: RequestFlyoutChild, close: () => void) => React.ReactNode;
}) {
  const [selectedChild, setSelectedChild] = useState<RequestFlyoutChild | null>(null);

  const toggleChild = useCallback((child: RequestFlyoutChild) => {
    setSelectedChild((prev) => (prev && getChildKey(prev) === getChildKey(child) ? null : child));
  }, []);
  const closeChild = useCallback(() => setSelectedChild(null), []);
  const isChildSelected = useCallback(
    (child: RequestFlyoutChild) =>
      !!selectedChild && getChildKey(selectedChild) === getChildKey(child),
    [selectedChild]
  );

  const value = useMemo(
    () => ({ selectedChild, toggleChild, closeChild, isChildSelected }),
    [selectedChild, toggleChild, closeChild, isChildSelected]
  );

  return (
    <RequestFlyoutChildContext.Provider value={value}>
      {children}
      {/* Keyed by the selection: switching rows remounts the child instead of reusing its state
          (selected sample, page, nested child). */}
      {selectedChild ? (
        <Fragment key={getChildKey(selectedChild)}>{render(selectedChild, closeChild)}</Fragment>
      ) : null}
    </RequestFlyoutChildContext.Provider>
  );
}

export function useRequestFlyoutChild(): RequestFlyoutChildContextValue {
  const ctx = useContext(RequestFlyoutChildContext);
  if (!ctx) {
    throw new Error('useRequestFlyoutChild must be used within a RequestFlyoutChildProvider');
  }
  return ctx;
}
