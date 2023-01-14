/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { OutPortal } from 'react-reverse-portal';
import { RouteProps } from '../../routes';
import { MonitorDetailsStatus } from '../monitor_details/monitor_details_status';
import { MonitorDetailsLocation } from '../monitor_details/monitor_details_location';
import { TestRunDate } from './components/test_run_date';
import { TEST_RUN_DETAILS_ROUTE } from '../../../../../common/constants';
import { TestRunDetails } from './test_run_details';
import { MonitorDetailsLinkPortalNode } from '../monitor_add_edit/portals';

export const getTestRunDetailsRoute = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
  baseTitle: string
): RouteProps => {
  return {
    title: i18n.translate('xpack.synthetics.testRunDetailsRoute.title', {
      defaultMessage: 'Test run details | {baseTitle}',
      values: { baseTitle },
    }),
    path: TEST_RUN_DETAILS_ROUTE,
    component: TestRunDetails,
    dataTestSubj: 'syntheticsMonitorTestRunDetailsPage',
    pageHeader: {
      breadcrumbs: [
        {
          text: <OutPortal node={MonitorDetailsLinkPortalNode} />,
        },
      ],
      pageTitle: (
        <FormattedMessage
          id="xpack.synthetics.testRunDetailsRoute.page.title"
          defaultMessage="Test run details"
        />
      ),
      rightSideItems: [<TestRunDate />, <MonitorDetailsStatus />, <MonitorDetailsLocation />],
    },
  };
};
