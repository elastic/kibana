/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { CspLoadingState } from './components/csp_loading_state';
import type { CspRouterProps } from './application/csp_router';
import type {
  CspClientPluginSetup,
  CspClientPluginStart,
  CspClientPluginSetupDeps,
  CspClientPluginStartDeps,
} from './types';

const CspRouterLazy = lazy(() => import('./application/csp_router'));
const CspRouter = (props: CspRouterProps) => (
  <Suspense fallback={<CspLoadingState />}>
    <CspRouterLazy {...props} />
  </Suspense>
);

export class CspPlugin
  implements
    Plugin<
      CspClientPluginSetup,
      CspClientPluginStart,
      CspClientPluginSetupDeps,
      CspClientPluginStartDeps
    >
{
  public setup(
    core: CoreSetup<CspClientPluginStartDeps, CspClientPluginStart>,
    plugins: CspClientPluginSetupDeps
  ): CspClientPluginSetup {
    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, plugins: CspClientPluginStartDeps): CspClientPluginStart {
    return {
      getCloudSecurityPostureRouter: () => (props: CspRouterProps) =>
        (
          <KibanaContextProvider services={{ ...core, ...plugins }}>
            <RedirectAppLinks coreStart={core}>
              <CspRouter {...props} />
            </RedirectAppLinks>
          </KibanaContextProvider>
        ),
    };
  }

  public stop() {}
}
