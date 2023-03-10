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

import { Router, Switch, Redirect, withRouter, RouteComponentProps } from 'react-router-dom';

import { Route } from '@kbn/shared-ux-router';

import { EuiPageContent_Deprecated as EuiPageContent, EuiEmptyPrompt, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { RegisterManagementAppArgs, ManagementAppMountParams } from '@kbn/management-plugin/public';

import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { LicenseManagementLocator } from '@kbn/license-management-plugin/public/locator';
import { LicenseStatus } from '../../common/types/license_status';
import { WatchListPage, WatchEditPage, WatchStatusPage } from './sections';
import { registerRouter } from './lib/navigation';
import { AppContextProvider } from './app_context';

const ShareRouter = withRouter(({ children, history }: RouteComponentProps & { children: any }) => {
  registerRouter({ history });
  return children;
});

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
  licenseManagementLocator?: LicenseManagementLocator;
}

export const App = (deps: AppDeps) => {
  const [{ valid, message }, setLicenseStatus] = useState<LicenseStatus>({ valid: true });

  useEffect(() => {
    const s = deps.licenseStatus$.subscribe(setLicenseStatus);
    return () => s.unsubscribe();
  }, [deps.licenseStatus$]);

  if (!valid) {
    const licenseManagementUrl = deps.licenseManagementLocator?.useUrl({ page: 'dashboard' });
    // if there is no licenseManagementUrl, the license management plugin might be disabled
    const promptAction = licenseManagementUrl ? (
      <EuiLink href={licenseManagementUrl}>
        <FormattedMessage
          id="xpack.watcher.app.licenseErrorLinkText"
          defaultMessage="Manage your license"
        />
      </EuiLink>
    ) : undefined;
    const promptBody = licenseManagementUrl ? (
      <p>{message}</p>
    ) : (
      <>
        <p>{message}</p>
        <p>
          <FormattedMessage
            id="xpack.watcher.app.licenseErrorBody"
            defaultMessage="Contact your administrator to change your license."
          />
        </p>
      </>
    );
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="warning"
          title={
            <h1>
              <FormattedMessage
                id="xpack.watcher.app.licenseErrorTitle"
                defaultMessage="License error"
              />
            </h1>
          }
          body={promptBody}
          actions={[promptAction]}
        />
      </EuiPageContent>
    );
  }
  return (
    <Router history={deps.history}>
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
  <Switch>
    <Route exact path="/watches" component={WatchListPage} />
    <Route exact path="/watches/watch/:id/status" component={WatchStatusPage} />
    <Route exact path="/watches/watch/:id/edit" component={WatchEditPage} />
    <Route exact path="/watches/new-watch/:type(json|threshold)" component={WatchEditPage} />
    <Redirect exact from="/" to="/watches" />
    <Redirect exact from="" to="/watches" />
  </Switch>
);
