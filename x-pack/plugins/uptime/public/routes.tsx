/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { EuiPageTemplateProps, EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  CERTIFICATES_ROUTE,
  MAPPING_ERROR_ROUTE,
  MONITOR_ROUTE,
  MONITOR_ADD_ROUTE,
  MONITOR_EDIT_ROUTE,
  MONITOR_MANAGEMENT_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
  STEP_DETAIL_ROUTE,
  SYNTHETIC_CHECK_STEPS_ROUTE,
} from '../common/constants';
import {
  MappingErrorPage,
  MonitorPage,
  AddMonitorPage,
  EditMonitorPage,
  MonitorManagementPage,
  StepDetailPage,
  NotFoundPage,
  SettingsPage,
  MonitorManagementBottomBar,
} from './pages';
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
import { SyntheticsCallout } from './components/overview/synthetics_callout';
import { APP_WRAPPER_CLASS } from '../../../../src/core/public';
import {
  StepDetailPageChildren,
  StepDetailPageHeader,
  StepDetailPageRightSideItem,
} from './pages/synthetics/step_detail_page';
import { UptimePageTemplateComponent } from './apps/uptime_page_template';
import { apiService } from './state/api/utils';
import { useInspectorContext } from '../../observability/public';
import { AddMonitorBtn } from './components/monitor_management/add_monitor_btn';
import { SettingsBottomBar } from './components/settings/settings_bottom_bar';
import { ServiceAllowedWrapper } from './pages/monitor_management/service_allowed_wrapper';

type RouteProps = {
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
} & EuiPageTemplateProps;

const baseTitle = i18n.translate('xpack.uptime.routes.baseTitle', {
  defaultMessage: 'Uptime - Kibana',
});

export const MONITORING_OVERVIEW_LABEL = i18n.translate('xpack.uptime.overview.heading', {
  defaultMessage: 'Monitors',
});

const getRoutes = (): RouteProps[] => {
  return [
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
      bottomBar: <SettingsBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
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
    {
      title: i18n.translate('xpack.uptime.mappingErrorRoute.title', {
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
              id="xpack.uptime.mappingErrorRoute.pageHeader.title"
              defaultMessage="Mapping error"
            />
          </div>
        ),
        rightSideItems: [],
      },
    },
    {
      title: i18n.translate('xpack.uptime.addMonitorRoute.title', {
        defaultMessage: 'Add Monitor | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ADD_ROUTE,
      component: () => (
        <ServiceAllowedWrapper>
          <AddMonitorPage />
        </ServiceAllowedWrapper>
      ),
      dataTestSubj: 'uptimeMonitorAddPage',
      telemetryId: UptimePage.MonitorAdd,
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.uptime.addMonitor.pageHeader.title"
            defaultMessage="Add Monitor"
          />
        ),
      },
      bottomBar: <MonitorManagementBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
    },
    {
      title: i18n.translate('xpack.uptime.editMonitorRoute.title', {
        defaultMessage: 'Edit Monitor | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_EDIT_ROUTE,
      component: () => (
        <ServiceAllowedWrapper>
          <EditMonitorPage />
        </ServiceAllowedWrapper>
      ),
      dataTestSubj: 'uptimeMonitorEditPage',
      telemetryId: UptimePage.MonitorEdit,
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.uptime.editMonitor.pageHeader.title"
            defaultMessage="Edit Monitor"
          />
        ),
      },
      bottomBar: <MonitorManagementBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
    },
    {
      title: i18n.translate('xpack.uptime.monitorManagementRoute.title', {
        defaultMessage: 'Monitor Management | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_MANAGEMENT_ROUTE + '/:type',
      component: () => (
        <ServiceAllowedWrapper>
          <MonitorManagementPage />
        </ServiceAllowedWrapper>
      ),
      dataTestSubj: 'uptimeMonitorManagementListPage',
      telemetryId: UptimePage.MonitorManagement,
      pageHeader: {
        pageTitle: (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.uptime.monitorManagement.pageHeader.title"
                defaultMessage="Monitor Management"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate('xpack.uptime.routes.monitorManagement.betaLabel', {
                  defaultMessage: 'This module is not GA. Please help us by reporting any bugs.',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        rightSideItems: [<AddMonitorBtn />],
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
              <SyntheticsCallout />
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
