/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { CoreVitalProps, HeaderMenuPortalProps } from './types';

const CoreVitalsLazy = lazy(() => import('./core_web_vitals/index'));

export function getCoreVitalsComponent(props: CoreVitalProps) {
  return (
    <Suspense fallback={null}>
      <CoreVitalsLazy {...props} />
    </Suspense>
  );
}

const HeaderMenuPortalLazy = lazy(() => import('./header_menu_portal'));

export function HeaderMenuPortal(props: HeaderMenuPortalProps) {
  return (
    <Suspense fallback={null}>
      <HeaderMenuPortalLazy {...props} />
    </Suspense>
  );
}
