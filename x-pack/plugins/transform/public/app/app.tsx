/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { EuiErrorBoundary } from '@elastic/eui';

import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import type { ExperimentalFeatures } from '../../common/config';
import { SECTION_SLUG } from './common/constants';
import type { AppDependencies } from './app_dependencies';
import { CloneTransformSection } from './sections/clone_transform';
import { CreateTransformSection } from './sections/create_transform';
import { TransformManagementSection } from './sections/transform_management';
import {
  EnabledFeaturesContextProvider,
  ExperimentalFeaturesContextProvider,
  type TransformEnabledFeatures,
} from './serverless_context';

export const App: FC<{ history: ScopedHistory }> = ({ history }) => (
  <Router history={history}>
    <Routes>
      <Route
        path={`/${SECTION_SLUG.CLONE_TRANSFORM}/:transformId`}
        component={CloneTransformSection}
      />
      <Route
        path={`/${SECTION_SLUG.CREATE_TRANSFORM}/:savedObjectId`}
        component={CreateTransformSection}
      />
      <Route path={`/`} component={TransformManagementSection} />
    </Routes>
  </Router>
);

export const renderApp = (
  element: HTMLElement,
  appDependencies: AppDependencies,
  enabledFeatures: TransformEnabledFeatures,
  experimentalFeatures: ExperimentalFeatures
) => {
  const I18nContext = appDependencies.i18n.Context;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false,
      },
    },
  });

  render(
    <EuiErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KibanaThemeProvider theme$={appDependencies.theme.theme$}>
          <KibanaContextProvider services={appDependencies}>
            <I18nContext>
              <EnabledFeaturesContextProvider enabledFeatures={enabledFeatures}>
                <ExperimentalFeaturesContextProvider experimentalFeatures={experimentalFeatures}>
                  <App history={appDependencies.history} />
                </ExperimentalFeaturesContextProvider>
              </EnabledFeaturesContextProvider>
            </I18nContext>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </QueryClientProvider>
    </EuiErrorBoundary>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
