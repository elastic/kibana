/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type {
  PackageGenericErrorsListComponent,
  PackageGenericErrorsListProps,
} from '@kbn/fleet-plugin/public';
import type { StartPlugins } from '../../../../../types';

export const getLazyEndpointGenericErrorsListExtension = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => {
  return lazy<PackageGenericErrorsListComponent>(async () => {
    const [{ withSecurityContext }, { EndpointGenericErrorsList }] = await Promise.all([
      import('./with_security_context/with_security_context'),
      import('./endpoint_generic_errors_list'),
    ]);

    return {
      default: withSecurityContext<PackageGenericErrorsListProps>({
        coreStart,
        depsStart,
        WrappedComponent: EndpointGenericErrorsList,
      }),
    };
  });
};
