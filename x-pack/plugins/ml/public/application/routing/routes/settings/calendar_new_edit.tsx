/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { useTimefilter } from '../../../contexts/kibana';
import { checkFullLicense } from '../../../license';
import {
  checkGetJobsCapabilitiesResolver,
  checkPermission,
} from '../../../capabilities/check_capabilities';
import { checkMlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { NewCalendar } from '../../../settings/calendars';
import { breadcrumbOnClickFactory, getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';

enum MODE {
  NEW,
  EDIT,
}

interface NewCalendarPageProps extends PageProps {
  mode: MODE;
}

export const newCalendarRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/settings/calendars_list/new_calendar',
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.NEW} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CALENDAR_MANAGEMENT_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.createLabel', {
        defaultMessage: 'Create',
      }),
      onClick: breadcrumbOnClickFactory('/settings/calendars_list/new_calendar', navigateToPath),
    },
  ],
});

export const editCalendarRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/settings/calendars_list/edit_calendar/:calendarId',
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.EDIT} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CALENDAR_MANAGEMENT_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.editLabel', {
        defaultMessage: 'Edit',
      }),
      onClick: breadcrumbOnClickFactory('/settings/calendars_list/edit_calendar', navigateToPath),
    },
  ],
});

const PageWrapper: FC<NewCalendarPageProps> = ({ location, mode, deps }) => {
  let calendarId: string | undefined;
  if (mode === MODE.EDIT) {
    const pathMatch: string[] | null = location.pathname.match(/.+\/(.+)$/);
    calendarId = pathMatch && pathMatch.length > 1 ? pathMatch[1] : undefined;
  }
  const { redirectToMlAccessDeniedPage } = deps;
  const redirectToJobsManagementPage = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE
  );

  const { context } = useResolver(undefined, undefined, deps.config, {
    checkFullLicense,
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    checkMlNodesAvailable: () => checkMlNodesAvailable(redirectToJobsManagementPage),
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const canCreateCalendar = checkPermission('canCreateCalendar');
  const canDeleteCalendar = checkPermission('canDeleteCalendar');

  return (
    <PageLoader context={context}>
      <NewCalendar {...{ calendarId, canCreateCalendar, canDeleteCalendar }} />
    </PageLoader>
  );
};
