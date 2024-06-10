/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  PackagePolicyEditExtensionComponent,
  PackagePolicyEditExtensionComponentProps,
} from '@kbn/fleet-plugin/public';
import type { FleetUiExtensionGetterOptions } from '../../../../../common/types';

export const getLazyEndpointPolicyEditExtension = ({
  coreStart,
  depsStart,
  services,
}: FleetUiExtensionGetterOptions) => {
  return lazy<PackagePolicyEditExtensionComponent>(async () => {
    const [{ withSecurityContext }, { EndpointPolicyEditExtension }] = await Promise.all([
      import('../../../../../common/components/with_security_context/with_security_context'),
      import('./endpoint_policy_edit_extension/endpoint_policy_edit_extension'),
    ]);

    return {
      default: withSecurityContext<PackagePolicyEditExtensionComponentProps>({
        coreStart,
        depsStart,
        services,
        WrappedComponent: EndpointPolicyEditExtension,
      }),
    };
  });
};
