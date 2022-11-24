/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type {
  PackagePolicyEditExtensionComponent,
  PackagePolicyEditExtensionComponentProps,
} from '@kbn/fleet-plugin/public';
import type { StartPlugins } from '../../../../../types';

export const getLazyEndpointPolicyEditExtension = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => {
  return lazy<PackagePolicyEditExtensionComponent>(async () => {
    const [{ withSecurityContext }, { EndpointPolicyEditExtension }] = await Promise.all([
      import('./components/with_security_context/with_security_context'),
      import('./endpoint_policy_edit_extension/endpoint_policy_edit_extension'),
    ]);

    return {
      default: withSecurityContext<PackagePolicyEditExtensionComponentProps>({
        coreStart,
        depsStart,
        WrappedComponent: EndpointPolicyEditExtension,
      }),
    };
  });
};
