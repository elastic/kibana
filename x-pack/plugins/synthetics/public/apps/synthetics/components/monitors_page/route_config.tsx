/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';

import { RefreshButton } from '../common/components/refresh_button';
import { OverviewPage } from './overview/overview_page';
import { MonitorsPageHeader } from './management/page_header/monitors_page_header';
import { CreateMonitorButton } from './create_monitor_button';
import { MonitorsPageWithServiceAllowed } from './monitors_page';
import { RouteProps } from '../../routes';
import { MONITORS_ROUTE, OVERVIEW_ROUTE } from '../../../../../common/constants';

export const getMonitorsRoute = (
  history: ReturnType<typeof useHistory>,
  location: ReturnType<typeof useLocation>,
  syntheticsPath: string,
  baseTitle: string
): RouteProps[] => {
  const sharedProps = {
    pageTitle: <MonitorsPageHeader />,
    rightSideItems: [<RefreshButton />, <CreateMonitorButton />],
  };
  return [
    {
      title: i18n.translate('xpack.synthetics.overviewRoute.title', {
        defaultMessage: 'Synthetics Overview | {baseTitle}',
        values: { baseTitle },
      }),
      path: OVERVIEW_ROUTE,
      component: OverviewPage,
      dataTestSubj: 'syntheticsOverviewPage',
      pageHeader: {
        ...sharedProps,
        tabs: getMonitorsTabs(syntheticsPath, 'overview', location),
      },
    },
    {
      title: i18n.translate('xpack.synthetics.monitorManagementRoute.title', {
        defaultMessage: 'Synthetics Management | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITORS_ROUTE,
      component: MonitorsPageWithServiceAllowed,
      dataTestSubj: 'syntheticsMonitorManagementPage',
      pageHeader: {
        ...sharedProps,
        tabs: getMonitorsTabs(syntheticsPath, 'management', location),
      },
    },
  ];
};

const getMonitorsTabs = (
  syntheticsPath: string,
  selected: 'overview' | 'management',
  location: ReturnType<typeof useLocation>
) => {
  return [
    {
      label: (
        <FormattedMessage
          id="xpack.synthetics.monitorManagement.overviewTab.title"
          defaultMessage="Overview"
        />
      ),
      href: `${syntheticsPath}${OVERVIEW_ROUTE}${location.search}`,
      isSelected: selected === 'overview',
      'data-test-subj': 'syntheticsMonitorOverviewTab',
    },
    {
      label: (
        <FormattedMessage
          id="xpack.synthetics.monitorManagement.monitorsTab.title"
          defaultMessage="Management"
        />
      ),
      href: `${syntheticsPath}${MONITORS_ROUTE}${location.search}`,
      isSelected: selected === 'management',
      'data-test-subj': 'syntheticsMonitorManagementTab',
    },
  ];
};
