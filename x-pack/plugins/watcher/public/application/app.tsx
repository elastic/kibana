/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import {
  DocLinksStart,
  HttpSetup,
  ToastsSetup,
  IUiSettingsClient,
  ApplicationStart,
  ExecutionContextStart,
} from '@kbn/core/public';

import { Router, Routes, Route, Navigate, PathRouteProps } from 'react-router-dom';

import { EuiPageContent_Deprecated as EuiPageContent, EuiEmptyPrompt, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { RegisterManagementAppArgs, ManagementAppMountParams } from '@kbn/management-plugin/public';

import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { LicenseStatus } from '../../common/types/license_status';
import { WatchListPage, WatchEditPage, WatchStatusPage } from './sections';
import { registerRouter } from './lib/navigation';
import { AppContextProvider } from './app_context';
import { useExecutionContext } from './shared_imports';

const ShareRouter = ({ children }: PathRouteProps & { children: JSX.Element }) => {
  registerRouter({ history });
  return children;
};

export interface AppDeps {
  docLinks: DocLinksStart;
  toasts: ToastsSetup;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  theme: ChartsPluginSetup['theme'];
  createTimeBuckets: () => any;
  licenseStatus$: Observable<LicenseStatus>;
  setBreadcrumbs: Parameters<RegisterManagementAppArgs['mount']>[0]['setBreadcrumbs'];
  history: ManagementAppMountParams['history'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  executionContext: ExecutionContextStart;
}

export const App = (deps: AppDeps) => {
  const [{ valid, message }, setLicenseStatus] = useState<LicenseStatus>({ valid: true });

  useEffect(() => {
    const s = deps.licenseStatus$.subscribe(setLicenseStatus);
    return () => s.unsubscribe();
  }, [deps.licenseStatus$]);

  useExecutionContext(deps.executionContext, {
    type: 'application',
    page: 'watcher',
  });

  if (!valid) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h1>
              <FormattedMessage
                id="xpack.watcher.app.licenseErrorTitle"
                defaultMessage="License error"
              />
            </h1>
          }
          body={<p>{message}</p>}
          actions={[
            <EuiLink
              href={deps.getUrlForApp('management', { path: 'stack/license_management/home' })}
            >
              <FormattedMessage
                id="xpack.watcher.app.licenseErrorLinkText"
                defaultMessage="Manage your license"
              />
            </EuiLink>,
          ]}
        />
      </EuiPageContent>
    );
  }
  return (
    <Router navigator={deps.history} location={deps.history.location}>
      <ShareRouter>
        <AppContextProvider value={deps}>
          <AppWithoutRouter />
        </AppContextProvider>
      </ShareRouter>
    </Router>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Routes>
    <Route path="/watches" element={WatchListPage} />
    <Route path="/watches/watch/:id/status" element={WatchStatusPage} />
    <Route path="/watches/watch/:id/edit" element={WatchEditPage} />
    <Route path="/watches/new-watch/:type(json|threshold)" element={WatchEditPage} />
    {['/', ''].map((path) => (
      <Route path={path} element={<Navigate to="/watches" />} />
    ))}
  </Routes>
);
