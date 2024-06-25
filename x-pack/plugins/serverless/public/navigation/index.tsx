/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, type FC } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Props as NavigationProps } from './navigation';

const SideNavComponentLazy = React.lazy(() => import('./navigation'));

export const SideNavComponent: FC<NavigationProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="s" />}>
    <SideNavComponentLazy {...props} />
  </Suspense>
);

export { manageOrgMembersNavCardName, generateManageOrgMembersNavCard } from './nav_cards';
