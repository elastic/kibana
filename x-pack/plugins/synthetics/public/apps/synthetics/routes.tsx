/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import React, { FC, useEffect } from 'react';
import { tint } from 'polished';
import { EuiPageTemplateProps, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { Route, Switch, useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useInspectorContext } from '@kbn/observability-plugin/public';
import { RunTestManually } from './components/monitor_summary/run_test_manually';
import { MonitorSummaryHeaderContent } from './components/monitor_summary/monitor_summary_header_content';
import { MonitorSummaryTitle } from './components/monitor_summary/monitor_summary_title';
import { MonitorSummaryPage } from './components/monitor_summary/monitor_summary';
import { GettingStartedPage } from './components/getting_started/getting_started_page';
import { MonitorAddEditPage } from './components/monitor_add_edit/monitor_add_edit_page';
import { MonitorsPageHeader } from './components/monitors_page/management/page_header/monitors_page_header';
import { OverviewPage } from './components/monitors_page/overview/overview_page';
import { SyntheticsPageTemplateComponent } from './components/common/pages/synthetics_page_template';
import { NotFoundPage } from './components/common/pages/not_found';
import { ServiceAllowedWrapper } from './components/common/wrappers/service_allowed_wrapper';
import {
  MONITOR_ADD_ROUTE,
  MONITORS_ROUTE,
  OVERVIEW_ROUTE,
  GETTING_STARTED_ROUTE,
  MONITOR_ROUTE,
} from '../../../common/constants';
import { MonitorPage } from './components/monitors_page/monitor_page';
import { apiService } from '../../utils/api_service';

type RouteProps = {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  pageHeader?: {
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

const getRoutes = (
  euiTheme: EuiThemeComputed,
  history: ReturnType<typeof useHistory>
): RouteProps[] => {
  return [
    {
      title: i18n.translate('xpack.synthetics.gettingStartedRoute.title', {
        defaultMessage: 'Synthetics Getting Started | {baseTitle}',
        values: { baseTitle },
      }),
      path: GETTING_STARTED_ROUTE,
      component: () => <GettingStartedPage />,
      dataTestSubj: 'syntheticsGettingStartedPage',
      template: 'centeredBody',
      pageContentProps: {
        paddingSize: 'none',
        hasShadow: false,
      },
    },
    {
      title: i18n.translate('xpack.synthetics.gettingStartedRoute.title', {
        defaultMessage: 'Synthetics Getting Started | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ROUTE,
      component: () => <MonitorSummaryPage />,
      template: 'centeredBody',
      dataTestSubj: 'syntheticsGettingStartedPage',
      pageContentProps: {
        paddingSize: 'none',
        hasShadow: false,
      },
      pageHeader: {
        paddingSize: 'none',
        children: <MonitorSummaryHeaderContent />,
        pageTitle: <MonitorSummaryTitle />,
        rightSideItems: [<RunTestManually />],
      },
    },
    {
      title: i18n.translate('xpack.synthetics.overviewRoute.title', {
        defaultMessage: 'Synthetics Overview | {baseTitle}',
        values: { baseTitle },
      }),
      path: OVERVIEW_ROUTE,
      component: () => <OverviewPage />,
      dataTestSubj: 'syntheticsOverviewPage',
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
        tabs: [
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.overviewTab.title"
                defaultMessage="Overview"
              />
            ),
            isSelected: true,
          },
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.monitorsTab.title"
                defaultMessage="Management"
              />
            ),
            onClick: () =>
              history.push({
                pathname: MONITORS_ROUTE,
              }),
          },
        ],
      },
    },
    {
      title: i18n.translate('xpack.synthetics.monitorManagementRoute.title', {
        defaultMessage: 'Monitor Management | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITORS_ROUTE,
      component: () => (
        <>
          <ServiceAllowedWrapper>
            <MonitorPage />
          </ServiceAllowedWrapper>
        </>
      ),
      dataTestSubj: 'syntheticsMonitorManagementPage',
      paddingSize: 'none',
      pageBodyProps: {
        style: { backgroundColor: tint(0.5, euiTheme.colors.body) },
      },
      pageContentProps: {
        paddingSize: 'l',
        style: { backgroundColor: euiTheme.colors.ghost },
      },
      pageHeader: {
        paddingSize: 'l',
        style: { margin: 0 },
        pageTitle: <MonitorsPageHeader />,
        tabs: [
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.overviewTab.title"
                defaultMessage="Overview"
              />
            ),
            onClick: () =>
              history.push({
                pathname: OVERVIEW_ROUTE,
              }),
          },
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.monitorsTab.title"
                defaultMessage="Management"
              />
            ),
            isSelected: true,
          },
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

const RouteInit: React.FC<Pick<RouteProps, 'path' | 'title'>> = ({ path, title }) => {
  useEffect(() => {
    document.title = title;
  }, [path, title]);
  return null;
};

export const PageRouter: FC = () => {
  const { addInspectorRequest } = useInspectorContext();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const routes = getRoutes(euiTheme, history);

  apiService.addInspectorRequest = addInspectorRequest;

  return (
    <Switch>
      {routes.map(
        ({
          title,
          path,
          component: RouteComponent,
          dataTestSubj,
          pageHeader,
          ...pageTemplateProps
        }: RouteProps) => (
          <Route path={path} key={dataTestSubj} exact={true}>
            <div className={APP_WRAPPER_CLASS} data-test-subj={dataTestSubj}>
              <RouteInit title={title} path={path} />
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
