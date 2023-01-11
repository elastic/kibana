/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ResolvedAt } from './components/resolved_at';
import { ErrorStartedAt } from './components/error_started_at';
import { ErrorDetailsPage } from './error_details_page';
import { ErrorDuration } from './components/error_duration';
import { MonitorDetailsLocation } from '../monitor_details/monitor_details_location';
import { ERROR_DETAILS_ROUTE } from '../../../../../common/constants';
import { RouteProps } from '../../routes';

export const getErrorDetailsRouteConfig = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
  baseTitle: string
) => {
  return {
    title: i18n.translate('xpack.synthetics.errorDetailsRoute.title', {
      defaultMessage: 'Error details | {baseTitle}',
      values: { baseTitle },
    }),
    path: ERROR_DETAILS_ROUTE,
    component: ErrorDetailsPage,
    dataTestSubj: 'syntheticsMonitorEditPage',
    pageHeader: {
      pageTitle: (
        <FormattedMessage
          id="xpack.synthetics.editMonitor.errorDetailsRoute.title"
          defaultMessage="Error details"
        />
      ),
      rightSideItems: [
        <ErrorDuration />,
        <MonitorDetailsLocation />,
        <ResolvedAt />,
        <ErrorStartedAt />,
      ],
    },
  } as RouteProps;
};
