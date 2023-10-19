/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import type { Props } from './chat';
export type { ChatApi, Props } from './chat';

/**
 * A suspense-compatible version of the Chat component.
 */
export const LazyChat = React.lazy(() => import('./chat').then(({ Chat }) => ({ default: Chat })));

/**
 * A lazily-loaded component that will display a trigger that will allow the user to chat with a
 * human operator when the service is enabled; otherwise, it renders nothing.
 */
export const Chat = (props: Props) => (
  <EuiErrorBoundary>
    <Suspense fallback={<></>}>
      <LazyChat {...props} />
    </Suspense>
  </EuiErrorBoundary>
);
