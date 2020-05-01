/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Route, Switch } from 'react-router-dom';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
import { OverviewPage } from './components/overview/overview_container';
import {
  CERTIFICATES_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
} from '../common/constants';
import { MonitorPage, NotFoundPage, SettingsPage } from './pages';
import { CertificatesPage } from './pages/certificates';

interface RouterProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
}

export const PageRouter: FC<RouterProps> = ({ autocomplete }) => (
  <Switch>
    <Route path={MONITOR_ROUTE}>
      <div data-test-subj="uptimeMonitorPage">
        <MonitorPage />
      </div>
    </Route>
    <Route path={SETTINGS_ROUTE}>
      <div data-test-subj="uptimeSettingsPage">
        <SettingsPage />
      </div>
    </Route>
    <Route path={CERTIFICATES_ROUTE}>
      <div data-test-subj="uptimeCertificatesPage">
        <CertificatesPage />
      </div>
    </Route>
    <Route path={OVERVIEW_ROUTE}>
      <div data-test-subj="uptimeOverviewPage">
        <OverviewPage autocomplete={autocomplete} />
      </div>
    </Route>
    <Route component={NotFoundPage} />
  </Switch>
);
