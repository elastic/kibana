/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackagePolicyCreateExtensionComponent } from '@kbn/fleet-plugin/public';

export const LazyEndpointPolicyCreateExtension = lazy<PackagePolicyCreateExtensionComponent>(
  async () => {
    const { EndpointPolicyCreateExtension } = await import('./endpoint_policy_create_extension');
    return {
      default: EndpointPolicyCreateExtension,
    };
  }
);
