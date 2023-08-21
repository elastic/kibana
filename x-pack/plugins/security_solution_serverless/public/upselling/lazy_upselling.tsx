/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const withSuspenseUpsell = <T extends object = {}>(
  Component: React.ComponentType<T>
): React.FC<T> =>
  function WithSuspenseUpsell(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <Component {...props} />
      </Suspense>
    );
  };

export const ThreatIntelligencePaywallLazy = withSuspenseUpsell(
  lazy(() => import('./pages/threat_intelligence_paywall'))
);

export const OsqueryResponseActionsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() => import('./pages/osquery_automated_response_actions'))
);
