/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TransactionDetailFlyout } from '../transaction_detail_flyout';
import { RequestFlyoutErrorsFlyout } from './errors_flyout';
import { RequestFlyoutOperationDetailFlyout } from './operation_detail_flyout';
import type { RequestFlyoutChild } from './request_flyout_child';
import type { RequestFlyoutContextValue } from './request_flyout_context';
import { RequestFlyoutResourceFlyout } from './resource_flyout';
import type { RequestFlyoutChildSession } from './types';

/** The child flyout to render for the selected row of a request flyout level. */
export function renderRequestFlyoutChild({
  child,
  close,
  context: { deps, connection, filters },
  childSession,
  historyKey,
}: {
  child: RequestFlyoutChild;
  close: () => void;
  context: RequestFlyoutContextValue;
  childSession: RequestFlyoutChildSession;
  historyKey: symbol;
}) {
  switch (child.kind) {
    case 'transaction':
      return (
        <TransactionDetailFlyout
          deps={deps}
          filters={{
            serviceName: connection.sourceServiceName,
            transactionName: child.name,
            transactionType: child.transactionType,
            ...filters,
          }}
          onClose={close}
          historyKey={historyKey}
        />
      );
    case 'operation':
      return (
        <RequestFlyoutOperationDetailFlyout
          spanName={child.spanName}
          dependencyName={child.dependencyName}
          session={childSession}
          historyKey={historyKey}
          onClose={close}
        />
      );
    case 'error':
      return (
        <RequestFlyoutErrorsFlyout bucket={child.bucket} historyKey={historyKey} onClose={close} />
      );
    case 'resource':
      return (
        <RequestFlyoutResourceFlyout
          resource={child.resource}
          historyKey={historyKey}
          onClose={close}
        />
      );
  }
}
