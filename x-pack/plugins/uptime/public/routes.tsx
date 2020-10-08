/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';
import { OverviewPage } from './components/overview/overview_container';
import {
  CERTIFICATES_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
} from '../common/constants';
import { MonitorPage, NotFoundPage, SettingsPage } from './pages';
import { CertificatesPage } from './pages/certificates';
import { UptimePage, useUptimeTelemetry } from './hooks';

interface RouteProps {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: UptimePage;
}

const baseTitle = 'Uptime - Kibana';

const Routes: RouteProps[] = [
  {
    title: `Monitor | ${baseTitle}`,
    path: MONITOR_ROUTE,
    component: MonitorPage,
    dataTestSubj: 'uptimeMonitorPage',
    telemetryId: UptimePage.Monitor,
  },
  {
    title: `Settings | ${baseTitle}`,
    path: SETTINGS_ROUTE,
    component: SettingsPage,
    dataTestSubj: 'uptimeSettingsPage',
    telemetryId: UptimePage.Settings,
  },
  {
    title: `Certificates | ${baseTitle}`,
    path: CERTIFICATES_ROUTE,
    component: CertificatesPage,
    dataTestSubj: 'uptimeCertificatesPage',
    telemetryId: UptimePage.Certificates,
  },
  {
    title: baseTitle,
    path: OVERVIEW_ROUTE,
    component: OverviewPage,
    dataTestSubj: 'uptimeOverviewPage',
    telemetryId: UptimePage.Overview,
  },
];

const RouteInit: React.FC<Pick<RouteProps, 'path' | 'title' | 'telemetryId'>> = ({
  path,
  title,
  telemetryId,
}) => {
  useUptimeTelemetry(telemetryId);
  useEffect(() => {
    document.title = title;
  }, [path, title]);
  return null;
};

export const PageRouter: FC = () => {
  return (
    <Switch>
      {Routes.map(({ title, path, component: RouteComponent, dataTestSubj, telemetryId }) => (
        <Route path={path} key={telemetryId}>
          <div data-test-subj={dataTestSubj}>
            <RouteInit title={title} path={path} telemetryId={telemetryId} />
            <RouteComponent />
          </div>
        </Route>
      ))}
      <Route component={NotFoundPage} />
    </Switch>
  );
};
