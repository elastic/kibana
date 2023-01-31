/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import React, { FC, useEffect } from 'react';
import { EuiIcon, EuiLink, EuiPageHeaderProps, useEuiTheme } from '@elastic/eui';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { OutPortal } from 'react-reverse-portal';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useInspectorContext } from '@kbn/observability-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
import { EditMonitorLink } from './components/common/links/edit_monitor';
import { MonitorDetailsLocation } from './components/monitor_details/monitor_details_location';
import { getStepDetailsRoute } from './components/step_details_page/route_config';
import { getTestRunDetailsRoute } from './components/test_run_details/route_config';
import { getSettingsRouteConfig } from './components/settings/route_config';
import { TestRunDetails } from './components/test_run_details/test_run_details';
import { MonitorAddPageWithServiceAllowed } from './components/monitor_add_edit/monitor_add_page';
import { MonitorEditPageWithServiceAllowed } from './components/monitor_add_edit/monitor_edit_page';
import { MonitorDetailsPageTitle } from './components/monitor_details/monitor_details_page_title';
import { MonitorDetailsPage } from './components/monitor_details/monitor_details_page';
import { GettingStartedPage } from './components/getting_started/getting_started_page';
import { MonitorsPageHeader } from './components/monitors_page/management/page_header/monitors_page_header';
import { CreateMonitorButton } from './components/monitors_page/create_monitor_button';
import { OverviewPage } from './components/monitors_page/overview/overview_page';
import { SyntheticsPageTemplateComponent } from './components/common/pages/synthetics_page_template';
import { NotFoundPage } from './components/common/pages/not_found';
import {
  MonitorTypePortalNode,
  MonitorDetailsLinkPortalNode,
} from './components/monitor_add_edit/portals';
import {
  GETTING_STARTED_ROUTE,
  MONITORS_ROUTE,
  MONITOR_ADD_ROUTE,
  MONITOR_EDIT_ROUTE,
  MONITOR_ERRORS_ROUTE,
  MONITOR_HISTORY_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
  TEST_RUN_DETAILS_ROUTE,
} from '../../../common/constants';
import { PLUGIN } from '../../../common/constants/plugin';
import { MonitorsPageWithServiceAllowed } from './components/monitors_page/monitors_page';
import { apiService } from '../../utils/api_service';
import { RunTestManually } from './components/monitor_details/run_test_manually';
import { MonitorDetailsStatus } from './components/monitor_details/monitor_details_status';
import { MonitorDetailsLastRun } from './components/monitor_details/monitor_details_last_run';
import { MonitorSummary } from './components/monitor_details/monitor_summary/monitor_summary';
import { MonitorHistory } from './components/monitor_details/monitor_history/monitor_history';
import { MonitorErrors } from './components/monitor_details/monitor_errors/monitor_errors';
import { getErrorDetailsRouteConfig } from './components/error_details/route_config';

export type RouteProps = LazyObservabilityPageTemplateProps & {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
};

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
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string
): RouteProps[] => {
  return [
    ...getSettingsRouteConfig(history, syntheticsPath, baseTitle),
    getErrorDetailsRouteConfig(history, syntheticsPath, baseTitle),
    getTestRunDetailsRoute(history, syntheticsPath, baseTitle),
    getStepDetailsRoute(history, syntheticsPath, baseTitle),
    {
      title: i18n.translate('xpack.synthetics.gettingStartedRoute.title', {
        defaultMessage: 'Synthetics Getting Started | {baseTitle}',
        values: { baseTitle },
      }),
      path: GETTING_STARTED_ROUTE,
      component: GettingStartedPage,
      dataTestSubj: 'syntheticsGettingStartedPage',
      pageSectionProps: {
        alignment: 'center',
        paddingSize: 'none',
      },
    },
    {
      title: i18n.translate('xpack.synthetics.monitorDetails.title', {
        defaultMessage: 'Synthetics Monitor Details | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ROUTE,
      component: () => (
        <MonitorDetailsPage>
          <MonitorSummary />
        </MonitorDetailsPage>
      ),
      dataTestSubj: 'syntheticsMonitorDetailsPage',
      pageHeader: getMonitorSummaryHeader(history, syntheticsPath, 'overview'),
    },
    {
      title: i18n.translate('xpack.synthetics.monitorHistory.title', {
        defaultMessage: 'Synthetics Monitor History | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_HISTORY_ROUTE,
      component: () => (
        <MonitorDetailsPage>
          <MonitorHistory />
        </MonitorDetailsPage>
      ),
      dataTestSubj: 'syntheticsMonitorHistoryPage',
      pageHeader: getMonitorSummaryHeader(history, syntheticsPath, 'history'),
    },
    {
      title: i18n.translate('xpack.synthetics.monitorErrors.title', {
        defaultMessage: 'Synthetics Monitor Errors | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ERRORS_ROUTE,
      component: () => (
        <MonitorDetailsPage>
          <MonitorErrors />
        </MonitorDetailsPage>
      ),
      dataTestSubj: 'syntheticsMonitorHistoryPage',
      pageHeader: getMonitorSummaryHeader(history, syntheticsPath, 'errors'),
    },
    {
      title: i18n.translate('xpack.synthetics.overviewRoute.title', {
        defaultMessage: 'Synthetics Overview | {baseTitle}',
        values: { baseTitle },
      }),
      path: OVERVIEW_ROUTE,
      component: OverviewPage,
      dataTestSubj: 'syntheticsOverviewPage',
      pageHeader: {
        pageTitle: <MonitorsPageHeader />,
        rightSideItems: [<CreateMonitorButton />],
        tabs: [
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.overviewTab.title"
                defaultMessage="Overview"
              />
            ),
            isSelected: true,
            'data-test-subj': 'syntheticsMonitorOverviewTab',
          },
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.monitorsTab.title"
                defaultMessage="Management"
              />
            ),
            href: `${syntheticsPath}${MONITORS_ROUTE}`,
            'data-test-subj': 'syntheticsMonitorManagementTab',
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
      component: MonitorsPageWithServiceAllowed,
      dataTestSubj: 'syntheticsMonitorManagementPage',
      pageHeader: {
        pageTitle: <MonitorsPageHeader />,
        rightSideItems: [<CreateMonitorButton />],
        tabs: [
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.overviewTab.title"
                defaultMessage="Overview"
              />
            ),
            href: `${syntheticsPath}${OVERVIEW_ROUTE}`,
            'data-test-subj': 'syntheticsMonitorOverviewTab',
          },
          {
            label: (
              <FormattedMessage
                id="xpack.synthetics.monitorManagement.monitorsTab.title"
                defaultMessage="Management"
              />
            ),
            isSelected: true,
            'data-test-subj': 'syntheticsMonitorManagementTab',
          },
        ],
      },
    },
    {
      title: i18n.translate('xpack.synthetics.createMonitorRoute.title', {
        defaultMessage: 'Create Monitor | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ADD_ROUTE,
      component: MonitorAddPageWithServiceAllowed,
      dataTestSubj: 'syntheticsMonitorAddPage',
      restrictWidth: true,
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.synthetics.createMonitor.pageHeader.title"
            defaultMessage="Create Monitor"
          />
        ),
        children: (
          <FormattedMessage
            id="xpack.synthetics.addMonitor.pageHeader.description"
            defaultMessage="For more information about available monitor types and other options, see our {docs}."
            values={{
              docs: (
                <EuiLink target="_blank" href="#">
                  <FormattedMessage
                    id="xpack.synthetics.addMonitor.pageHeader.docsLink"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        ),
      },
    },
    {
      title: i18n.translate('xpack.synthetics.editMonitorRoute.title', {
        defaultMessage: 'Edit Monitor | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_EDIT_ROUTE,
      component: MonitorEditPageWithServiceAllowed,
      dataTestSubj: 'syntheticsMonitorEditPage',
      restrictWidth: true,
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.synthetics.editMonitor.pageHeader.title"
            defaultMessage="Edit Monitor"
          />
        ),
        rightSideItems: [<OutPortal node={MonitorTypePortalNode} />],
        breadcrumbs: [
          {
            text: <OutPortal node={MonitorDetailsLinkPortalNode} />,
          },
        ],
      },
    },
    {
      title: i18n.translate('xpack.synthetics.testRunDetailsRoute.title', {
        defaultMessage: 'Test run details | {baseTitle}',
        values: { baseTitle },
      }),
      path: TEST_RUN_DETAILS_ROUTE,
      component: TestRunDetails,
      dataTestSubj: 'syntheticsMonitorTestRunDetailsPage',
      pageHeader: {
        pageTitle: (
          <FormattedMessage
            id="xpack.synthetics.testRunDetailsRoute.page.title"
            defaultMessage="Test run details"
          />
        ),
      },
    },
  ];
};

const getMonitorSummaryHeader = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
  selectedTab: 'overview' | 'history' | 'errors'
): EuiPageHeaderProps => {
  // Not a component, but it doesn't matter. Hooks are just functions
  const match = useRouteMatch<{ monitorId: string }>(MONITOR_ROUTE); // eslint-disable-line react-hooks/rules-of-hooks

  if (!match) {
    return {};
  }

  const search = history.location.search;
  const monitorId = match.params.monitorId;

  return {
    pageTitle: <MonitorDetailsPageTitle />,
    breadcrumbs: [
      {
        text: (
          <>
            <EuiIcon size="s" type="arrowLeft" />{' '}
            <FormattedMessage
              id="xpack.synthetics.monitorSummaryRoute.monitorBreadcrumb"
              defaultMessage="Monitors"
            />
          </>
        ),
        color: 'primary',
        'aria-current': false,
        href: `${syntheticsPath}${OVERVIEW_ROUTE}`,
      },
    ],
    rightSideItems: [
      <EditMonitorLink />,
      <RunTestManually />,
      <MonitorDetailsLastRun />,
      <MonitorDetailsStatus />,
      <MonitorDetailsLocation />,
    ],
    tabs: [
      {
        label: i18n.translate('xpack.synthetics.monitorOverviewTab.title', {
          defaultMessage: 'Overview',
        }),
        isSelected: selectedTab === 'overview',
        href: `${syntheticsPath}${MONITOR_ROUTE.replace(':monitorId?', monitorId)}${search}`,
        'data-test-subj': 'syntheticsMonitorOverviewTab',
      },
      {
        label: i18n.translate('xpack.synthetics.monitorHistoryTab.title', {
          defaultMessage: 'History',
        }),
        isSelected: selectedTab === 'history',
        href: `${syntheticsPath}${MONITOR_HISTORY_ROUTE.replace(':monitorId', monitorId)}${search}`,
        'data-test-subj': 'syntheticsMonitorHistoryTab',
      },
      {
        label: i18n.translate('xpack.synthetics.monitorErrorsTab.title', {
          defaultMessage: 'Errors',
        }),
        prepend: <EuiIcon type="alert" color="danger" />,
        isSelected: selectedTab === 'errors',
        href: `${syntheticsPath}${MONITOR_ERRORS_ROUTE.replace(':monitorId', monitorId)}${search}`,
        'data-test-subj': 'syntheticsMonitorErrorsTab',
      },
    ],
  };
};

const RouteInit: React.FC<Pick<RouteProps, 'path' | 'title'>> = ({ path, title }) => {
  useEffect(() => {
    document.title = title;
  }, [path, title]);
  return null;
};

export const PageRouter: FC = () => {
  const { services } = useKibana();
  const { addInspectorRequest } = useInspectorContext();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const routes = getRoutes(
    euiTheme,
    history,
    services.application!.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID)
  );

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
