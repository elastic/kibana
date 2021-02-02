/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { lazy, Suspense } from 'react';
import { CoreVitalProps, HeaderMenuPortalProps } from './types';

export function getCoreVitalsComponent(props: CoreVitalProps) {
  const CoreVitalsLazy = lazy(() => import('./core_web_vitals/index'));
  return (
    <Suspense fallback={null}>
      <CoreVitalsLazy {...props} />
    </Suspense>
  );
}

export function HeaderMenuPortal(props: HeaderMenuPortalProps) {
  const HeaderMenuPortalLazy = lazy(() => import('./header_menu_portal'));
  return (
    <Suspense fallback={null}>
      <HeaderMenuPortalLazy {...props} />
    </Suspense>
  );
}
