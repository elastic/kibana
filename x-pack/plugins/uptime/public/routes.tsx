/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import styled from 'styled-components';
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
import {
  SyntheticsCheckSteps,
  SyntheticsCheckStepsPageHeader,
  SyntheticsCheckStepsPageRightSideItem,
} from './pages/synthetics/synthetics_checks';
import { ClientPluginsStart } from './apps/plugin';
import { MonitorPageTitle, MonitorPageTitleContent } from './components/monitor/monitor_title';
import { UptimeDatePicker } from './components/common/uptime_date_picker';
import { useKibana } from '../../../../src/plugins/kibana_react/public';
import { CertRefreshBtn } from './components/certificates/cert_refresh_btn';
import { CertificateTitle } from './components/certificates/certificate_title';
import { SyntheticsCallout } from './components/overview/synthetics_callout';
import {
  StepDetailPageChildren,
  StepDetailPageHeader,
  StepDetailPageRightSideItem,
} from './pages/synthetics/step_detail_page';

interface RouteProps {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: UptimePage;
  pageHeader: {
    pageTitle: string | JSX.Element;
    children?: JSX.Element;
    rightSideItems?: JSX.Element[];
  };
}

const baseTitle = i18n.translate('xpack.uptime.routes.baseTitle', {
  defaultMessage: 'Uptime - Kibana',
});

export const MONITORING_OVERVIEW_LABEL = i18n.translate('xpack.uptime.overview.heading', {
  defaultMessage: 'Monitors',
});

const Routes: RouteProps[] = [
  {
    title: i18n.translate('xpack.uptime.monitorRoute.title', {
      defaultMessage: 'Monitor | {baseTitle}',
      values: { baseTitle },
    }),
    path: MONITOR_ROUTE,
    component: MonitorPage,
    dataTestSubj: 'uptimeMonitorPage',
    telemetryId: UptimePage.Monitor,
    pageHeader: {
      children: <MonitorPageTitleContent />,
      pageTitle: <MonitorPageTitle />,
      rightSideItems: [<UptimeDatePicker />],
    },
  },
  {
    title: i18n.translate('xpack.uptime.settingsRoute.title', {
      defaultMessage: `Settings | {baseTitle}`,
      values: { baseTitle },
    }),
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
    title: i18n.translate('xpack.uptime.certificatesRoute.title', {
      defaultMessage: `Certificates | {baseTitle}`,
      values: { baseTitle },
    }),
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
    title: i18n.translate('xpack.uptime.stepDetailRoute.title', {
      defaultMessage: 'Synthetics detail | {baseTitle}',
      values: { baseTitle },
    }),
    path: STEP_DETAIL_ROUTE,
    component: StepDetailPage,
    dataTestSubj: 'uptimeStepDetailPage',
    telemetryId: UptimePage.StepDetail,
    pageHeader: {
      children: <StepDetailPageChildren />,
      pageTitle: <StepDetailPageHeader />,
      rightSideItems: [<StepDetailPageRightSideItem />],
    },
  },
  {
    title: baseTitle,
    path: SYNTHETIC_CHECK_STEPS_ROUTE,
    component: SyntheticsCheckSteps,
    dataTestSubj: 'uptimeSyntheticCheckStepsPage',
    telemetryId: UptimePage.SyntheticCheckStepsPage,
    pageHeader: {
      pageTitle: <SyntheticsCheckStepsPageHeader />,
      rightSideItems: [<SyntheticsCheckStepsPageRightSideItem />],
    },
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

  const StyledPageTemplateComponent = styled(PageTemplateComponent)`
    .euiPageHeaderContent > .euiFlexGroup {
      flex-wrap: wrap;
    }
  `;

  return (
    <Switch>
      {Routes.map(
        ({ title, path, component: RouteComponent, dataTestSubj, telemetryId, pageHeader }) => (
          <Route path={path} key={telemetryId} exact={true}>
            <div data-test-subj={dataTestSubj}>
              <SyntheticsCallout />
              <RouteInit title={title} path={path} telemetryId={telemetryId} />
              <StyledPageTemplateComponent pageHeader={pageHeader}>
                <RouteComponent />
              </StyledPageTemplateComponent>
            </div>
          </Route>
        )
      )}
      <Route component={NotFoundPage} />
    </Switch>
  );
};
