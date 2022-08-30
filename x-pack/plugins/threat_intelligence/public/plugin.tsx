/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import React, { Suspense } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from './hooks/use_kibana';
import {
  Services,
  ThreatIntelligencePluginSetup,
  ThreatIntelligencePluginStart,
  ThreatIntelligencePluginStartDeps,
  SecuritySolutionPluginContext,
} from './types';
import { SecuritySolutionContext } from './containers/security_solution_context';
import { EnterpriseGuard } from './containers/enterprise_guard';

interface AppProps {
  securitySolutionContext: SecuritySolutionPluginContext;
}

const LazyIndicatorsPage = React.lazy(() => import('./modules/indicators/indicators_page'));

/**
 * This is used here:
 * x-pack/plugins/security_solution/public/threat_intelligence/pages/threat_intelligence.tsx
 */
export const createApp =
  (services: Services) =>
  () =>
  ({ securitySolutionContext }: AppProps) =>
    (
      <IntlProvider>
        <SecuritySolutionContext.Provider value={securitySolutionContext}>
          <EnterpriseGuard>
            <KibanaContextProvider services={services}>
              <Suspense fallback={<div />}>
                <LazyIndicatorsPage />
              </Suspense>
            </KibanaContextProvider>
          </EnterpriseGuard>
        </SecuritySolutionContext.Provider>
      </IntlProvider>
    );

export class ThreatIntelligencePlugin implements Plugin<void, void> {
  public async setup(): Promise<ThreatIntelligencePluginSetup> {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: ThreatIntelligencePluginStartDeps
  ): ThreatIntelligencePluginStart {
    const localPluginServices = {
      storage: new Storage(localStorage),
    };

    const services = {
      ...localPluginServices,
      ...core,
      ...plugins,
    } as Services;

    return { getComponent: createApp(services) };
  }

  public stop() {}
}
