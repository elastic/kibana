/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const withSuspenseIcon = <T extends object = {}>(Component: React.ComponentType<T>): React.FC<T> =>
  function WithSuspenseIcon(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <Component {...props} />
      </Suspense>
    );
  };

export const IconLensLazy = withSuspenseIcon(React.lazy(() => import('./icons/lens')));
export const IconEndpointLazy = withSuspenseIcon(React.lazy(() => import('./icons/endpoint')));
export const IconDataConnectorLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/data_connector'))
);
export const IconIndexManagementLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/index_management'))
);
export const IconSpacesLazy = withSuspenseIcon(React.lazy(() => import('./icons/spaces')));
export const IconDevToolsLazy = withSuspenseIcon(React.lazy(() => import('./icons/dev_tools')));
export const IconFleetLazy = withSuspenseIcon(React.lazy(() => import('./icons/fleet')));
export const IconAuditbeatLazy = withSuspenseIcon(React.lazy(() => import('./icons/auditbeat')));
export const IconSiemLazy = withSuspenseIcon(React.lazy(() => import('./icons/siem')));
export const IconEcctlLazy = withSuspenseIcon(React.lazy(() => import('./icons/ecctl')));
export const IconGraphLazy = withSuspenseIcon(React.lazy(() => import('./icons/graph')));
export const IconLoggingLazy = withSuspenseIcon(React.lazy(() => import('./icons/logging')));
export const IconMapServicesLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/map_services'))
);
export const IconSecurityShieldLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/security_shield'))
);
export const IconProductFeaturesAlertingLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/product_features_alerting'))
);
export const IconTimelineLazy = withSuspenseIcon(React.lazy(() => import('./icons/timeline')));
export const IconOsqueryLazy = withSuspenseIcon(React.lazy(() => import('./icons/osquery')));
