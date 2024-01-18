/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { lazy, Suspense } from 'react';

import type { ApiKeyFlyoutProps } from './api_key_flyout_types';

const ApiKeyFlyout = lazy(() => import('./api_key_flyout'));

export function renderApiKeyFlyout(
  props: ApiKeyFlyoutProps | undefined,
  deps: {}
): ReactElement | null {
  return props ? (
    <Suspense fallback={<></>}>
      <ApiKeyFlyout {...props} {...deps} />
    </Suspense>
  ) : null;
}
