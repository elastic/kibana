/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { HeaderMenuPortalProps } from '../../types';

const HeaderMenuPortalLazy = lazy(() => import('./header_menu_portal'));

export function HeaderMenuPortal(props: HeaderMenuPortalProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <HeaderMenuPortalLazy {...props} />
    </Suspense>
  );
}
