/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { PackagePolicyCreateExtensionComponent } from '@kbn/fleet-plugin/public';
import type { FleetUiExtensionGetterOptions } from './types';

export const getLazyEndpointPolicyCreateExtension = ({
  coreStart,
  depsStart,
  services,
}: FleetUiExtensionGetterOptions) => {
  return lazy<PackagePolicyCreateExtensionComponent>(async () => {
    const [{ withSecurityContext }, { EndpointPolicyCreateExtension }] = await Promise.all([
      import('./components/with_security_context/with_security_context'),
      import('./endpoint_policy_create_extension'),
    ]);

    return {
      default: withSecurityContext({
        coreStart,
        depsStart,
        services,
        WrappedComponent: EndpointPolicyCreateExtension,
      }),
    };
  });
};
