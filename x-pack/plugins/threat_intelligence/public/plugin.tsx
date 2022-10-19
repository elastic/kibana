/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  registerEvents as registerSubscriptionEvents,
  SubscriptionTrackingProvider,
} from '@kbn/subscription-tracking';
import { Provider as ReduxStoreProvider } from 'react-redux';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from './hooks/use_kibana';
import {
  SecuritySolutionPluginContext,
  Services,
  ThreatIntelligencePluginSetup,
  ThreatIntelligencePluginStart,
  ThreatIntelligencePluginStartDeps,
} from './types';
import { SecuritySolutionContext } from './containers/security_solution_context';
import { EnterpriseGuard } from './containers/enterprise_guard';

interface AppProps {
  securitySolutionContext: SecuritySolutionPluginContext;
}

const LazyIndicatorsPageWrapper = React.lazy(() => import('./containers/indicators_page_wrapper'));

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
        <ReduxStoreProvider store={securitySolutionContext.getSecuritySolutionStore}>
          <SecuritySolutionContext.Provider value={securitySolutionContext}>
            <KibanaContextProvider services={services}>
              <SubscriptionTrackingProvider
                analyticsClient={services.analytics}
                navigateToApp={services.application.navigateToApp}
              >
                <EnterpriseGuard>
                  <LazyIndicatorsPageWrapper />
                </EnterpriseGuard>
              </SubscriptionTrackingProvider>
            </KibanaContextProvider>
          </SecuritySolutionContext.Provider>
        </ReduxStoreProvider>
      </IntlProvider>
    );

export class ThreatIntelligencePlugin implements Plugin<void, void> {
  public async setup(core: CoreSetup): Promise<ThreatIntelligencePluginSetup> {
    registerSubscriptionEvents(core.analytics);
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

    return {
      getComponent: createApp(services),
    };
  }

  public stop() {}
}
