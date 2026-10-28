/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { RequestFlyoutChildProvider } from './request_flyout_child';
import { RequestFlyoutContextProvider } from './request_flyout_context';
import type { RequestFlyoutContextValue } from './request_flyout_context';
import type { RequestFlyoutChild } from './request_flyout_child';

export const TEST_CONTEXT: RequestFlyoutContextValue = {
  deps: { core: {} as unknown as CoreStart, share: {} as unknown as SharePublicStart },
  connection: {
    sourceServiceName: 'frontend',
    sourceLabel: 'frontend',
    targetLabel: 'postgresql',
    dependencies: ['postgresql'],
    dependencyName: 'postgresql',
  },
  filters: {
    environment: 'production',
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
    rangeFrom: 'now-1h',
    rangeTo: 'now',
  },
};

/** Renders `ui` inside the request flyout context; the open child is rendered as its kind. */
export function renderInRequestFlyout(
  ui: React.ReactElement,
  contextOverrides: Partial<RequestFlyoutContextValue> = {},
  renderChild: (child: RequestFlyoutChild) => React.ReactNode = (child) => (
    <div data-test-subj="openChild">{child.kind}</div>
  )
) {
  return render(
    <RequestFlyoutContextProvider value={{ ...TEST_CONTEXT, ...contextOverrides }}>
      <RequestFlyoutChildProvider render={renderChild}>{ui}</RequestFlyoutChildProvider>
    </RequestFlyoutContextProvider>
  );
}
