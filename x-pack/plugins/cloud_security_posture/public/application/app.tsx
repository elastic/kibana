/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiErrorBoundary } from '@elastic/eui';
import { APP_WRAPPER_CLASS, type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider, RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { Router } from 'react-router-dom';
import { cloudPosturePages } from '../common/navigation/constants';
import type { CspClientPluginStartDeps } from '../types';
import { pageToComponentMapping } from './constants';
import { CspRouter, getRoutesFromMapping } from './csp_router';

export interface CspAppDeps {
  core: CoreStart;
  deps: CspClientPluginStartDeps;
  params: AppMountParameters;
}

const cspPluginRoutes = getRoutesFromMapping(cloudPosturePages, pageToComponentMapping);

export const CspApp = ({ core, deps, params }: CspAppDeps) => (
  <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
    <KibanaContextProvider services={{ ...deps, ...core }}>
      <EuiErrorBoundary>
        <Router history={params.history}>
          <I18nProvider>
            <CspRouter routes={cspPluginRoutes} />
          </I18nProvider>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </RedirectAppLinks>
);
