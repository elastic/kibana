/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { NavigateToPath, useTimefilter } from '../../../contexts/kibana';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { checkFullLicense } from '../../../license';
import {
  checkGetJobsCapabilitiesResolver,
  checkPermission,
} from '../../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { CalendarsList } from '../../../settings/calendars';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const calendarListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/settings/calendars_list',
  title: i18n.translate('xpack.ml.settings.calendarList.docTitle', {
    defaultMessage: 'Calendars',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CALENDAR_MANAGEMENT_BREADCRUMB'),
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, deps.dataViewsContract, {
    checkFullLicense,
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    getMlNodeCount,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const canCreateCalendar = checkPermission('canCreateCalendar');
  const canDeleteCalendar = checkPermission('canDeleteCalendar');

  return (
    <PageLoader context={context}>
      <CalendarsList {...{ canCreateCalendar, canDeleteCalendar }} />
    </PageLoader>
  );
};
