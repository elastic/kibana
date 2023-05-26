/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import React, { FC, useEffect } from 'react';
import { EuiButtonEmpty, EuiLink, useEuiTheme } from '@elastic/eui';
import { Route } from '@kbn/shared-ux-router';
import { Switch, useHistory, useLocation } from 'react-router-dom';
import { OutPortal } from 'react-reverse-portal';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useSyntheticsPrivileges } from './hooks/use_synthetics_priviliges';
import { ClientPluginsStart } from '../../plugin';
import { getMonitorsRoute } from './components/monitors_page/route_config';
import { SyntheticsPageTemplateComponent } from './components/common/page_template/synthetics_page_template';
import { getMonitorDetailsRoute } from './components/monitor_details/route_config';
import { getStepDetailsRoute } from './components/step_details_page/route_config';
import { getTestRunDetailsRoute } from './components/test_run_details/route_config';
import { getSettingsRouteConfig } from './components/settings/route_config';
import { TestRunDetails } from './components/test_run_details/test_run_details';
import { MonitorAddPageWithServiceAllowed } from './components/monitor_add_edit/monitor_add_page';
import { MonitorEditPageWithServiceAllowed } from './components/monitor_add_edit/monitor_edit_page';
import { GettingStartedPage } from './components/getting_started/getting_started_page';
import {
  MonitorDetailsLinkPortalNode,
  MonitorTypePortalNode,
} from './components/monitor_add_edit/portals';
import {
  GETTING_STARTED_ROUTE,
  MONITOR_ADD_ROUTE,
  MONITOR_EDIT_ROUTE,
  TEST_RUN_DETAILS_ROUTE,
} from '../../../common/constants';
import { PLUGIN } from '../../../common/constants/plugin';
import { apiService } from '../../utils/api_service';
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

const getRoutes = (
  euiTheme: EuiThemeComputed,
  history: ReturnType<typeof useHistory>,
  location: ReturnType<typeof useLocation>,
  syntheticsPath: string
): RouteProps[] => {
  return [
    ...getSettingsRouteConfig(history, syntheticsPath, baseTitle),
    getErrorDetailsRouteConfig(history, syntheticsPath, baseTitle),
    getTestRunDetailsRoute(history, syntheticsPath, baseTitle),
    getStepDetailsRoute(history, syntheticsPath, baseTitle),
    ...getMonitorDetailsRoute(history, syntheticsPath, baseTitle),
    ...getMonitorsRoute(history, location, syntheticsPath, baseTitle),
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
                <EuiLink
                  data-test-subj="syntheticsGetRoutesDocumentationLink"
                  target="_blank"
                  href="https://www.elastic.co/guide/en/observability/current/monitor-uptime-synthetics.html"
                >
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

const RouteInit: React.FC<Pick<RouteProps, 'path' | 'title'>> = ({ path, title }) => {
  useEffect(() => {
    document.title = title;
  }, [path, title]);
  return null;
};

export const PageRouter: FC = () => {
  const { application } = useKibana<ClientPluginsStart>().services;
  const { addInspectorRequest } = useInspectorContext();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();

  const routes = getRoutes(
    euiTheme,
    history,
    location,
    application.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID)
  );

  apiService.addInspectorRequest = addInspectorRequest;

  const isUnPrivileged = useSyntheticsPrivileges();

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
                pageHeader={isUnPrivileged ? undefined : pageHeader}
                data-test-subj={'synthetics-page-template'}
                isPageDataLoaded={true}
                {...pageTemplateProps}
              >
                {isUnPrivileged || <RouteComponent />}
              </SyntheticsPageTemplateComponent>
            </div>
          </Route>
        )
      )}
      <Route
        component={() => (
          <SyntheticsPageTemplateComponent>
            <NotFoundPrompt
              actions={[
                <EuiButtonEmpty
                  data-test-subj="syntheticsPageRouterGoToSyntheticsHomePageButton"
                  iconType="arrowLeft"
                  flush="both"
                  onClick={() => {
                    application.navigateToApp(PLUGIN.SYNTHETICS_PLUGIN_ID);
                  }}
                >
                  {i18n.translate('xpack.synthetics.routes.goToSynthetics', {
                    defaultMessage: 'Go to Synthetics Home Page',
                  })}
                </EuiButtonEmpty>,
              ]}
            />
          </SyntheticsPageTemplateComponent>
        )}
      />
    </Switch>
  );
};
