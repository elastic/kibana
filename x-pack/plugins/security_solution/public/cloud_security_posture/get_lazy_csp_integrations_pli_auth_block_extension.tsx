/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { FleetUiExtensionGetterOptions } from '../management/pages/policy/view/ingest_manager_integration/types';

export const getLazyCspIntegrationsPliAuthBlockExtension = ({
  coreStart,
  depsStart,
  services,
}: FleetUiExtensionGetterOptions) =>
  lazy(async () => {
    const [{ withSecurityContext }, { LazyPliBlockCsp }] = await Promise.all([
      import(
        '../management/pages/policy/view/ingest_manager_integration/components/with_security_context/with_security_context'
      ),
      import('./lazy_pli_block_csp'),
    ]);

    return {
      default: withSecurityContext({
        coreStart,
        depsStart,
        services,
        WrappedComponent: LazyPliBlockCsp,
      }),
    };
  });
