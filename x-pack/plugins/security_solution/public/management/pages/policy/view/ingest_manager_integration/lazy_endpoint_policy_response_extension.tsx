/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type {
  PackagePolicyResponseExtensionComponent,
  PackagePolicyResponseExtensionComponentProps,
} from '@kbn/fleet-plugin/public';
import type { StartPlugins } from '../../../../../types';

export const getLazyEndpointPolicyResponseExtension = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => {
  return lazy<PackagePolicyResponseExtensionComponent>(async () => {
    const [{ withSecurityContext }, { EndpointPolicyResponseExtension }] = await Promise.all([
      import('./components/with_security_context/with_security_context'),
      import('./endpoint_policy_response_extension'),
    ]);

    return {
      default: withSecurityContext<PackagePolicyResponseExtensionComponentProps>({
        coreStart,
        depsStart,
        WrappedComponent: EndpointPolicyResponseExtension,
      }),
    };
  });
};
