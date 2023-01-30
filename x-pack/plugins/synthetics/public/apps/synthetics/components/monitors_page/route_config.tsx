/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';

import { OverviewPage } from './overview/overview_page';
import { MonitorsPageHeader } from './management/page_header/monitors_page_header';
import { CreateMonitorButton } from './create_monitor_button';
import { MonitorsPageWithServiceAllowed } from './monitors_page';
import { RouteProps } from '../../routes';
import { MONITORS_ROUTE, OVERVIEW_ROUTE } from '../../../../../common/constants';

export const getMonitorsRoute = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
  baseTitle: string
): RouteProps[] => {
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
        pageTitle: <MonitorsPageHeader />,
        rightSideItems: [<CreateMonitorButton />],
        tabs: getMonitorsTabs(syntheticsPath, 'overview'),
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
        tabs: getMonitorsTabs(syntheticsPath, 'management'),
      },
    },
  ];
};

const getMonitorsTabs = (syntheticsPath: string, selected: 'overview' | 'management') => {
  return [
    {
      label: (
        <FormattedMessage
          id="xpack.synthetics.monitorManagement.overviewTab.title"
          defaultMessage="Overview"
        />
      ),
      href: `${syntheticsPath}${OVERVIEW_ROUTE}`,
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
      href: `${syntheticsPath}${MONITORS_ROUTE}`,
      isSelected: selected === 'management',
      'data-test-subj': 'syntheticsMonitorManagementTab',
    },
  ];
};
