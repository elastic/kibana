/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export const EndpointPolicyProtectionsLazy = lazy(() =>
  import('./endpoint_policy_protections').then(({ EndpointPolicyProtections }) => ({
    default: EndpointPolicyProtections,
  }))
);

export const RuleDetailsEndpointExceptionsLazy = lazy(() =>
  import('./rule_details_endpoint_exceptions').then(({ RuleDetailsEndpointExceptions }) => ({
    default: RuleDetailsEndpointExceptions,
  }))
);
