/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { RequestFlyoutLevel } from '../request_flyout_level';
import { RequestFlyoutContextProvider, useRequestFlyoutContext } from '../request_flyout_context';
import type { RequestFlyoutConnection } from '../types';

interface Props {
  resource: string;
  historyKey: symbol;
  onClose: () => void;
}

/** Flyout of one resource of a grouped edge: a service → dependency flyout scoped to it. */
export function RequestFlyoutResourceFlyout({ resource, historyKey, onClose }: Props) {
  const {
    deps,
    filters,
    connection: { sourceServiceName, sourceLabel },
  } = useRequestFlyoutContext();

  // The data hooks refetch when `dependencies` changes identity.
  const value = useMemo(() => {
    const connection: RequestFlyoutConnection = {
      sourceServiceName,
      sourceLabel,
      targetLabel: resource,
      dependencies: [resource],
      dependencyName: resource,
    };
    return { deps, filters, connection };
  }, [deps, filters, sourceServiceName, sourceLabel, resource]);

  const title = `${sourceLabel} → ${resource}`;

  return (
    <RequestFlyoutContextProvider value={value}>
      <RequestFlyoutLevel
        data-test-subj="requestFlyoutResourceFlyout"
        title={title}
        onClose={onClose}
        session="inherit"
        size="fill"
        // Its own child flyouts start a new session: EUI allows one main and one child flyout
        // per session.
        childSession="start"
        historyKey={historyKey}
      />
    </RequestFlyoutContextProvider>
  );
}
