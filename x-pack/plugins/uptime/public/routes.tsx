/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { Props as PageHeaderProps, PageHeader } from './components/common/header/page_header';
import {
  CERTIFICATES_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
  STEP_DETAIL_ROUTE,
  SYNTHETIC_CHECK_STEPS_ROUTE,
} from '../common/constants';
import { MonitorPage, StepDetailPage, NotFoundPage, SettingsPage } from './pages';
import { CertificatesPage } from './pages/certificates';
import { UptimePage, useUptimeTelemetry } from './hooks';
import { OverviewPageComponent } from './pages/overview';
import { SyntheticsCheckSteps } from './pages/synthetics/synthetics_checks';

interface RouteProps {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: UptimePage;
  headerProps?: PageHeaderProps;
}

const baseTitle = 'Uptime - Kibana';

const Routes: RouteProps[] = [
  {
    title: `Monitor | ${baseTitle}`,
    path: MONITOR_ROUTE,
    component: MonitorPage,
    dataTestSubj: 'uptimeMonitorPage',
    telemetryId: UptimePage.Monitor,
    headerProps: {
      showDatePicker: true,
      showMonitorTitle: true,
    },
  },
  {
    title: `Settings | ${baseTitle}`,
    path: SETTINGS_ROUTE,
    component: SettingsPage,
    dataTestSubj: 'uptimeSettingsPage',
    telemetryId: UptimePage.Settings,
    headerProps: {
      showTabs: true,
    },
  },
  {
    title: `Certificates | ${baseTitle}`,
    path: CERTIFICATES_ROUTE,
    component: CertificatesPage,
    dataTestSubj: 'uptimeCertificatesPage',
    telemetryId: UptimePage.Certificates,
    headerProps: {
      showCertificateRefreshBtn: true,
      showTabs: true,
    },
  },
  {
    title: baseTitle,
    path: STEP_DETAIL_ROUTE,
    component: StepDetailPage,
    dataTestSubj: 'uptimeStepDetailPage',
    telemetryId: UptimePage.StepDetail,
  },
  {
    title: baseTitle,
    path: SYNTHETIC_CHECK_STEPS_ROUTE,
    component: SyntheticsCheckSteps,
    dataTestSubj: 'uptimeSyntheticCheckStepsPage',
    telemetryId: UptimePage.SyntheticCheckStepsPage,
  },
  {
    title: baseTitle,
    path: OVERVIEW_ROUTE,
    component: OverviewPageComponent,
    dataTestSubj: 'uptimeOverviewPage',
    telemetryId: UptimePage.Overview,
    headerProps: {
      showDatePicker: true,
      showTabs: true,
    },
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
    <>
      {/* Independent page header route that matches all paths and passes appropriate header props */}
      {/* Prevents the header from being remounted on route changes */}
      <Route
        path={[...Routes.map((route) => route.path)]}
        exact={true}
        render={({ match }: RouteComponentProps) => {
          const routeProps: RouteProps | undefined = Routes.find(
            (route: RouteProps) => route?.path === match?.path
          );
          return routeProps?.headerProps && <PageHeader {...routeProps?.headerProps} />;
        }}
      />
      <Switch>
        {Routes.map(({ title, path, component: RouteComponent, dataTestSubj, telemetryId }) => (
          <Route path={path} key={telemetryId} exact={true}>
            <div data-test-subj={dataTestSubj}>
              <RouteInit title={title} path={path} telemetryId={telemetryId} />
              <RouteComponent />
            </div>
          </Route>
        ))}
        <Route component={NotFoundPage} />
      </Switch>
    </>
  );
};
