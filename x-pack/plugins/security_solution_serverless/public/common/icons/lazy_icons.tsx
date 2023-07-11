/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const withSuspense = <T extends object = {}>(Component: React.ComponentType<T>): React.FC<T> =>
  function LazyIconWithSuspense(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <Component {...props} />
      </Suspense>
    );
  };

export const LazyIcons = {
  Lens: withSuspense(React.lazy(() => import('./lens'))),
  Endpoint: withSuspense(React.lazy(() => import('./endpoint'))),
  DataConnector: withSuspense(React.lazy(() => import('./data_connector'))),
  IndexManagement: withSuspense(React.lazy(() => import('./index_management'))),
  Spaces: withSuspense(React.lazy(() => import('./spaces'))),
  DevTools: withSuspense(React.lazy(() => import('./dev_tools'))),
  Fleet: withSuspense(React.lazy(() => import('./fleet'))),
  Auditbeat: withSuspense(React.lazy(() => import('./auditbeat'))),
  Siem: withSuspense(React.lazy(() => import('./siem'))),
};
