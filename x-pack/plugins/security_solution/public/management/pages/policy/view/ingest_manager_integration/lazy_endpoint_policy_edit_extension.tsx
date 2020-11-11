/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import { PackagePolicyEditExtensionComponent } from '../../../../../../../fleet/public';

export const LazyEndpointPolicyEditExtension = lazy<PackagePolicyEditExtensionComponent>(
  async () => {
    const { EndpointPolicyEditExtension } = await import('./endpoint_policy_edit_extension');
    return {
      // FIXME: remove casting once old UI component registration is removed
      default: (EndpointPolicyEditExtension as unknown) as PackagePolicyEditExtensionComponent,
    };
  }
);
