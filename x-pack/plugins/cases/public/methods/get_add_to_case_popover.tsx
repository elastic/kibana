/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { AddToCaseActionProps } from '../components/add_to_case';

const AddToCasePopoverLazy = lazy(() => import('../components/add_to_case/popover'));
export const getAddToCasePopoverLazy = (props: AddToCaseActionProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <AddToCasePopoverLazy {...props} />
  </Suspense>
);
