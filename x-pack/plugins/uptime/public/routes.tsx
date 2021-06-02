/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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
import { ClientPluginsStart } from './apps/plugin';
import { MonitorPageTitle } from './components/monitor/monitor_title';
import { UptimeDatePicker } from './components/common/uptime_date_picker';
import { useKibana } from '../../../../src/plugins/kibana_react/public';
import { CertRefreshBtn } from './components/certificates/cert_refresh_btn';
import { CertificateTitle } from './components/certificates/certificate_title';
import { SyntheticsCallout } from './components/overview/synthetics_callout';

interface RouteProps {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: UptimePage;
  pageHeader?: { pageTitle: string | JSX.Element; rightSideItems?: JSX.Element[] };
}

const baseTitle = 'Uptime - Kibana';

export const MONITORING_OVERVIEW_LABEL = i18n.translate('xpack.uptime.overview.heading', {
  defaultMessage: 'Monitoring overview',
});

const Routes: RouteProps[] = [
  {
    title: `Monitor | ${baseTitle}`,
    path: MONITOR_ROUTE,
    component: MonitorPage,
    dataTestSubj: 'uptimeMonitorPage',
    telemetryId: UptimePage.Monitor,
    pageHeader: {
      pageTitle: <MonitorPageTitle />,
      rightSideItems: [<UptimeDatePicker />],
    },
  },
  {
    title: `Settings | ${baseTitle}`,
    path: SETTINGS_ROUTE,
    component: SettingsPage,
    dataTestSubj: 'uptimeSettingsPage',
    telemetryId: UptimePage.Settings,
    pageHeader: {
      pageTitle: (
        <FormattedMessage id="xpack.uptime.settings.heading" defaultMessage="Uptime settings" />
      ),
    },
  },
  {
    title: `Certificates | ${baseTitle}`,
    path: CERTIFICATES_ROUTE,
    component: CertificatesPage,
    dataTestSubj: 'uptimeCertificatesPage',
    telemetryId: UptimePage.Certificates,
    pageHeader: {
      pageTitle: <CertificateTitle />,
      rightSideItems: [<CertRefreshBtn />],
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
    pageHeader: {
      pageTitle: MONITORING_OVERVIEW_LABEL,
      rightSideItems: [<UptimeDatePicker />],
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
  const {
    services: { observability },
  } = useKibana<ClientPluginsStart>();
  const PageTemplateComponent = observability.navigation.PageTemplate;

  return (
    <Switch>
      {Routes.map(
        ({ title, path, component: RouteComponent, dataTestSubj, telemetryId, pageHeader }) => (
          <Route path={path} key={telemetryId} exact={true}>
            <div data-test-subj={dataTestSubj}>
              <SyntheticsCallout />
              <RouteInit title={title} path={path} telemetryId={telemetryId} />
              {pageHeader ? (
                <PageTemplateComponent pageHeader={pageHeader}>
                  <RouteComponent />
                </PageTemplateComponent>
              ) : (
                <RouteComponent />
              )}
            </div>
          </Route>
        )
      )}
      <Route component={NotFoundPage} />
    </Switch>
  );
};
