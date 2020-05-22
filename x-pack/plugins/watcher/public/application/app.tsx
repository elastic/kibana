/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import {
  DocLinksStart,
  HttpSetup,
  ToastsSetup,
  IUiSettingsClient,
  ApplicationStart,
} from 'kibana/public';

import { Router, Switch, Route, Redirect, withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  RegisterManagementAppArgs,
  ManagementAppMountParams,
} from '../../../../../src/plugins/management/public';

import { LicenseStatus } from '../../common/types/license_status';
import { WatchStatus } from './sections/watch_status/components/watch_status';
import { WatchEdit } from './sections/watch_edit/components/watch_edit';
import { WatchList } from './sections/watch_list/components/watch_list';
import { registerRouter } from './lib/navigation';
import { AppContextProvider } from './app_context';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

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
}

export const App = (deps: AppDeps) => {
  const [{ valid, message }, setLicenseStatus] = useState<LicenseStatus>({ valid: true });

  useEffect(() => {
    const s = deps.licenseStatus$.subscribe(setLicenseStatus);
    return () => s.unsubscribe();
  }, [deps.licenseStatus$]);

  if (!valid) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.watcher.app.licenseErrorTitle"
            defaultMessage="License error"
          />
        }
        color="danger"
        iconType="help"
      >
        {message}{' '}
        <EuiLink href={deps.getUrlForApp('management', { path: 'stack/license_management/home' })}>
          <FormattedMessage
            id="xpack.watcher.app.licenseErrorLinkText"
            defaultMessage="Manage your license."
          />
        </EuiLink>
      </EuiCallOut>
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
    <Route exact path="/watches" component={WatchList} />
    <Route exact path="/watches/watch/:id/status" component={WatchStatus} />
    <Route exact path="/watches/watch/:id/edit" component={WatchEdit} />
    <Route exact path="/watches/new-watch/:type(json|threshold)" component={WatchEdit} />
    <Redirect exact from="/" to="/watches" />
    <Redirect exact from="" to="/watches" />
  </Switch>
);
