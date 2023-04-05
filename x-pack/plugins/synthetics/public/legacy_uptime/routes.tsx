/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useInspectorContext } from '@kbn/observability-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
import { ManageLocations } from './pages/monitor_management/manage_locations';
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
} from '../../common/constants';
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
  APIKeysButton,
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
import {
  StepDetailPageChildren,
  StepDetailPageHeader,
  StepDetailPageRightSideItem,
} from './pages/synthetics/step_detail_page';
import { UptimePageTemplateComponent } from './app/uptime_page_template';
import { apiService } from './state/api/utils';
import { AddMonitorBtn } from './components/monitor_management/add_monitor_btn';
import { SettingsBottomBar } from './components/settings/settings_bottom_bar';
import { ServiceAllowedWrapper } from './pages/monitor_management/service_allowed_wrapper';

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
    {
      title: i18n.translate('xpack.synthetics.addMonitorRoute.title', {
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
            id="xpack.synthetics.addMonitor.pageHeader.title"
            defaultMessage="Add Monitor"
          />
        ),
        rightSideItems: [<APIKeysButton />, <ManageLocations />],
      },
      bottomBar: <MonitorManagementBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
    },
    {
      title: i18n.translate('xpack.synthetics.editMonitorRoute.title', {
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
            id="xpack.synthetics.editMonitor.pageHeader.title"
            defaultMessage="Edit Monitor"
          />
        ),
        rightSideItems: [<APIKeysButton />, <ManageLocations />],
      },
      bottomBar: <MonitorManagementBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
    },
    {
      title: i18n.translate('xpack.synthetics.monitorManagementRoute.title', {
        defaultMessage: 'Monitor Management | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_MANAGEMENT_ROUTE + '/:type?',
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
                id="xpack.synthetics.monitorManagement.pageHeader.title"
                defaultMessage="Monitor Management"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate(
                  'xpack.synthetics.routes.monitorManagement.betaLabel',
                  {
                    defaultMessage:
                      'This functionality is in beta and is subject to change. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Beta features are not subject to the support service level agreement of official generally available features.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        rightSideItems: [<AddMonitorBtn />, <APIKeysButton />, <ManageLocations />],
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
