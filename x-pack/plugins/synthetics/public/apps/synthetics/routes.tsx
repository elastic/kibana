/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { EuiPageTemplateProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useInspectorContext } from '@kbn/observability-plugin/public';
import { MonitorAddEditPage } from './components/monitor_add_edit/monitor_add_edit_page';
import { OverviewPage } from './components/overview/overview_page';
import { SyntheticsPageTemplateComponent } from './components/common/pages/synthetics_page_template';
import { NotFoundPage } from './components/common/pages/not_found';
import { ServiceAllowedWrapper } from './components/common/wrappers/service_allowed_wrapper';
import {
  MONITOR_ADD_ROUTE,
  MONITOR_MANAGEMENT_ROUTE,
  OVERVIEW_ROUTE,
} from '../../../common/constants';
import { MonitorManagementPage } from './components/monitor_management/monitor_management_page';
import { apiService } from './utils/api_service';
import { SyntheticsPage, useSyntheticsTelemetry } from './hooks/use_telemetry';

type RouteProps = {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: SyntheticsPage;
  pageHeader: {
    pageTitle: string | JSX.Element;
    children?: JSX.Element;
    rightSideItems?: JSX.Element[];
  };
} & EuiPageTemplateProps;

const baseTitle = i18n.translate('xpack.synthetics.routes.baseTitle', {
  defaultMessage: 'Synthetics - Kibana',
});

export const MONITOR_MANAGEMENT_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.heading',
  {
    defaultMessage: 'Monitor Management',
  }
);

const getRoutes = (): RouteProps[] => {
  return [
    {
      title: i18n.translate('xpack.synthetics.overviewRoute.title', {
        defaultMessage: 'Synthetics Overview | {baseTitle}',
        values: { baseTitle },
      }),
      path: OVERVIEW_ROUTE,
      component: () => <OverviewPage />,
      dataTestSubj: 'syntheticsOverviewPage',
      telemetryId: SyntheticsPage.Overview,
      pageHeader: {
        pageTitle: (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.synthetics.overview.pageHeader.title"
                defaultMessage="Overview"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        rightSideItems: [
          /* <AddMonitorBtn />*/
        ],
      },
    },
    {
      title: i18n.translate('xpack.synthetics.monitorManagementRoute.title', {
        defaultMessage: 'Monitor Management | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_MANAGEMENT_ROUTE,
      component: () => (
        <ServiceAllowedWrapper>
          <MonitorManagementPage />
        </ServiceAllowedWrapper>
      ),
      dataTestSubj: 'syntheticsMonitorManagementPage',
      telemetryId: SyntheticsPage.MonitorManagement,
      pageHeader: {
        pageTitle: (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.pageHeader.title"
                defaultMessage="Monitor Management"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        rightSideItems: [
          /* <AddMonitorBtn />*/
        ],
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
          <MonitorAddEditPage />
        </ServiceAllowedWrapper>
      ),
      dataTestSubj: 'syntheticsMonitorAddPage',
      telemetryId: SyntheticsPage.MonitorAdd,
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.synthetics.addMonitor.pageHeader.title"
            defaultMessage="Add Monitor"
          />
        ),
      },
      // bottomBar: <MonitorManagementBottomBar />,
      bottomBarProps: { paddingSize: 'm' as const },
    },
  ];
};

const RouteInit: React.FC<Pick<RouteProps, 'path' | 'title' | 'telemetryId'>> = ({
  path,
  title,
  telemetryId,
}) => {
  useSyntheticsTelemetry(telemetryId);
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
              {/* <SyntheticsCallout /> TODO: See if the callout is needed for Synthetics App as well */}
              <RouteInit title={title} path={path} telemetryId={telemetryId} />
              <SyntheticsPageTemplateComponent
                path={path}
                pageHeader={pageHeader}
                {...pageTemplateProps}
              >
                <RouteComponent />
              </SyntheticsPageTemplateComponent>
            </div>
          </Route>
        )
      )}
      <Route component={NotFoundPage} />
    </Switch>
  );
};
