/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { lazy } from 'react';
import type { PackageCustomExtensionComponent } from '@kbn/fleet-plugin/public';
import type { StartPlugins } from '../../../../../types';

export const getLazyEndpointPackageCustomExtension = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => {
  return lazy<PackageCustomExtensionComponent>(async () => {
    const [{ withSecurityContext }, { EndpointPackageCustomExtension }] = await Promise.all([
      import('./components/with_security_context/with_security_context'),
      import('./endpoint_package_custom_extension'),
    ]);
    return {
      default: withSecurityContext({
        coreStart,
        depsStart,
        WrappedComponent: EndpointPackageCustomExtension,
      }),
    };
  });
};
