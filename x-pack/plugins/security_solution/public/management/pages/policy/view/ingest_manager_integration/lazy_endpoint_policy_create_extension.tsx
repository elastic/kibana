/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import { PackagePolicyCreateExtensionComponent } from '../../../../../../../fleet/public';

export const LazyEndpointPolicyCreateExtension = lazy<PackagePolicyCreateExtensionComponent>(
  async () => {
    const { EndpointPolicyCreateExtension } = await import('./endpoint_policy_create_extension');
    return {
      default: EndpointPolicyCreateExtension,
    };
  }
);
