/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import {
  CERTIFICATES_ROUTE,
  MAPPING_ERROR_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
  STEP_DETAIL_ROUTE,
  SYNTHETIC_CHECK_STEPS_ROUTE,
} from '../../common/constants';
import { MappingErrorPage, MonitorPage, StepDetailPage, NotFoundPage, SettingsPage } from './pages';
import { CertificatesPage } from './pages/certificates';
import { UptimePage, useUptimeTelemetry } from './hooks';
import { OverviewPageComponent } from './pages/overview';
import {
  SyntheticsCheckSteps,
  SyntheticsCheckStepsPageHeader,
  SyntheticsCheckStepsPageRightSideItem,
} from './pages/synthetics/synthetics_checks';
import { MonitorPageTitle, MonitorPageTitleContent } from './components/monitor/monitor_title';
import { UptimeDatePicker } from './components/common/uptime_date_picker';
import { CertRefreshBtn } from './components/certificates/cert_refresh_btn';
import { CertificateTitle } from './components/certificates/certificate_title';
import {
  StepDetailPageChildren,
  StepDetailPageHeader,
  StepDetailPageRightSideItem,
} from './pages/synthetics/step_detail_page';
import { UptimePageTemplateComponent } from './app/uptime_page_template';
import { apiService } from './state/api/utils';
import { SettingsBottomBar } from './components/settings/settings_bottom_bar';

type RouteProps = LazyObservabilityPageTemplateProps & {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: UptimePage;
};

const baseTitle = i18n.translate('xpack.synthetics.routes.legacyBaseTitle', {
  defaultMessage: 'Uptime - Kibana',
});

export const MONITORING_OVERVIEW_LABEL = i18n.translate('xpack.synthetics.overview.heading', {
  defaultMessage: 'Monitors',
});

const getRoutes = (): RouteProps[] => {
  return [
    {
      title: i18n.translate('xpack.synthetics.monitorRoute.title', {
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
      title: i18n.translate('xpack.synthetics.settingsRoute.title', {
        defaultMessage: `Settings | {baseTitle}`,
        values: { baseTitle },
      }),
      path: SETTINGS_ROUTE,
      component: SettingsPage,
      dataTestSubj: 'uptimeSettingsPage',
      telemetryId: UptimePage.Settings,
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.synthetics.settings.heading"
            defaultMessage="Uptime settings"
          />
        ),
      },
      bottomBar: <SettingsBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
    },
    {
      title: i18n.translate('xpack.synthetics.certificatesRoute.title', {
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
      title: i18n.translate('xpack.synthetics.stepDetailRoute.title', {
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
    {
      title: i18n.translate('xpack.synthetics.mappingErrorRoute.title', {
        defaultMessage: 'Synthetics | mapping error',
      }),
      path: MAPPING_ERROR_ROUTE,
      component: MappingErrorPage,
      dataTestSubj: 'uptimeMappingErrorPage',
      telemetryId: UptimePage.MappingError,
      pageHeader: {
        pageTitle: (
          <div>
            <FormattedMessage
              id="xpack.synthetics.mappingErrorRoute.pageHeader.title"
              defaultMessage="Mapping error"
            />
          </div>
        ),
        rightSideItems: [],
      },
    },
  ];
};

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
  const routes = getRoutes();
  const { addInspectorRequest } = useInspectorContext();

  apiService.addInspectorRequest = addInspectorRequest;

  return (
    <Switch>
      {routes.map(
        ({
          title,
          path,
          component: RouteComponent,
          dataTestSubj,
          telemetryId,
          pageHeader,
          ...pageTemplateProps
        }) => (
          <Route path={path} key={telemetryId} exact={true}>
            <div className={APP_WRAPPER_CLASS} data-test-subj={dataTestSubj}>
              <RouteInit title={title} path={path} telemetryId={telemetryId} />
              <UptimePageTemplateComponent
                path={path}
                pageHeader={pageHeader}
                {...pageTemplateProps}
              >
                <RouteComponent />
              </UptimePageTemplateComponent>
            </div>
          </Route>
        )
      )}
      <Route component={NotFoundPage} />
    </Switch>
  );
};
