/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { Provider as ReduxStoreProvider } from 'react-redux';
import React, { Suspense } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { generateAttachmentType } from './modules/cases/utils/attachments';
import { KibanaContextProvider } from './hooks/use_kibana';
import {
  SecuritySolutionPluginContext,
  Services,
  SetupPlugins,
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
 * x-pack/plugins/security_solution/public/threat_intelligence/routes.tsx
 */
export const createApp =
  (services: Services) =>
  () =>
  ({ securitySolutionContext }: AppProps) =>
    (
      <IntlProvider>
        <ReduxStoreProvider store={securitySolutionContext.securitySolutionStore}>
          <SecuritySolutionContext.Provider value={securitySolutionContext}>
            <KibanaContextProvider services={services}>
              <EnterpriseGuard>
                <Suspense fallback={<div />}>
                  <LazyIndicatorsPageWrapper />
                </Suspense>
              </EnterpriseGuard>
            </KibanaContextProvider>
          </SecuritySolutionContext.Provider>
        </ReduxStoreProvider>
      </IntlProvider>
    );

export class ThreatIntelligencePlugin implements Plugin<void, void> {
  public async setup(
    core: CoreSetup,
    plugins: SetupPlugins
  ): Promise<ThreatIntelligencePluginSetup> {
    const externalAttachmentType: ExternalReferenceAttachmentType = generateAttachmentType();
    plugins.cases.attachmentFramework.registerExternalReference(externalAttachmentType);

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
