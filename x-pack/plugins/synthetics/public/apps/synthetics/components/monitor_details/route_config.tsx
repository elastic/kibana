/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { EuiIcon, EuiPageHeaderProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MonitorDetailsPageTitle } from './monitor_details_page_title';
import { EditMonitorLink } from '../common/links/edit_monitor';
import { RunTestManually } from './run_test_manually';
import { MonitorDetailsLastRun } from './monitor_details_last_run';
import { MonitorDetailsStatus } from './monitor_details_status';
import { MonitorDetailsLocation } from './monitor_details_location';
import { MonitorErrors } from './monitor_errors/monitor_errors';
import { MonitorHistory } from './monitor_history/monitor_history';
import { MonitorSummary } from './monitor_summary/monitor_summary';
import { MonitorDetailsPage } from './monitor_details_page';
import {
  MONITOR_ERRORS_ROUTE,
  MONITOR_HISTORY_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
} from '../../../../../common/constants';
import { RouteProps } from '../../routes';

export const getMonitorDetailsRoute = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
  baseTitle: string
): RouteProps[] => {
  return [
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
