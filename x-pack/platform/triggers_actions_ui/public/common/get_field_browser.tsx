/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import type { FieldBrowserProps } from '../application/sections/field_browser';

const FieldBrowserLazy: React.FC<FieldBrowserProps> = lazy(
  () => import('../application/sections/field_browser')
);

export const getFieldBrowserLazy = (props: FieldBrowserProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <FieldBrowserLazy {...props} />
  </Suspense>
);
