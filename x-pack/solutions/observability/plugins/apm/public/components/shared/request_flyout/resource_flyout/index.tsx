/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RequestFlyoutContent } from '../request_flyout_content';
import { RequestFlyoutContextProvider, useRequestFlyoutContext } from '../request_flyout_context';
import type { RequestFlyoutConnection } from '../types';

interface Props {
  resource: string;
  historyKey: symbol;
  onClose: () => void;
}

/**
 * Flyout of one resource of a grouped edge: the content of a service → dependency flyout, scoped
 * to that resource. Its own child flyouts (operation, errors) start a new session, because EUI
 * allows one main and one child flyout per session.
 */
export function RequestFlyoutResourceFlyout({ resource, historyKey, onClose }: Props) {
  const {
    deps,
    filters,
    connection: { sourceServiceName, sourceLabel },
  } = useRequestFlyoutContext();
  const titleId = useGeneratedHtmlId({ prefix: 'requestFlyoutResourceTitle' });

  // Memoized on what it is made of: the data hooks refetch when `dependencies` changes identity.
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
      <EuiFlyout
        data-test-subj="requestFlyoutResourceFlyout"
        onClose={onClose}
        ownFocus={false}
        size="fill"
        session="inherit"
        historyKey={historyKey}
        flyoutMenuDisplayMode="always"
        flyoutMenuProps={{ title }}
        aria-labelledby={titleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={titleId}>{title}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <RequestFlyoutContent childSession="start" historyKey={historyKey} />
      </EuiFlyout>
    </RequestFlyoutContextProvider>
  );
}
