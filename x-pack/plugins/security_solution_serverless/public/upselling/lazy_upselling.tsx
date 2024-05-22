/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { withSuspenseUpsell } from '@kbn/security-solution-upselling/helpers';

export const ThreatIntelligencePaywallLazy = withSuspenseUpsell(
  lazy(() => import('./pages/threat_intelligence_paywall'))
);

export const OsqueryResponseActionsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() => import('./pages/osquery_automated_response_actions'))
);

export const EndpointExceptionsDetailsUpsellingLazy = withSuspenseUpsell(
  lazy(() => import('./pages/endpoint_management/endpoint_exceptions_details'))
);

export const EntityAnalyticsUpsellingPageLazy = withSuspenseUpsell(
  lazy(() =>
    import('@kbn/security-solution-upselling/pages/entity_analytics').then(
      ({ EntityAnalyticsUpsellingPage }) => ({
        default: EntityAnalyticsUpsellingPage,
      })
    )
  )
);

export const EntityAnalyticsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('@kbn/security-solution-upselling/sections/entity_analytics').then(
      ({ EntityAnalyticsUpsellingSection }) => ({
        default: EntityAnalyticsUpsellingSection,
      })
    )
  )
);
