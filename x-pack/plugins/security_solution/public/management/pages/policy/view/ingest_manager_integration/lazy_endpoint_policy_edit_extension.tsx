/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import { CoreStart } from 'kibana/public';
import { PackagePolicyEditExtensionComponent } from '../../../../../../../fleet/public';
import { StartPlugins } from '../../../../../types';

export const LazyEndpointPolicyEditExtension = lazy<PackagePolicyEditExtensionComponent>(
  async () => {
    const { EndpointPolicyEditExtension } = await import('./endpoint_policy_edit_extension');
    return {
      // FIXME: remove casting once old UI component registration is removed
      default: (EndpointPolicyEditExtension as unknown) as PackagePolicyEditExtensionComponent,
    };
  }
);

export const getLazyEndpointPolicyEditExtension = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => {
  return lazy<PackagePolicyEditExtensionComponent>(async () => {
    const [{ withSecurityContext }, { EndpointPolicyEditExtension }] = await Promise.all([
      import('./with_security_context'),
      import('./endpoint_policy_edit_extension'),
    ]);

    return {
      default: withSecurityContext({
        coreStart,
        depsStart,
        WrappedComponent: EndpointPolicyEditExtension,
      }),
    };
  });
};
