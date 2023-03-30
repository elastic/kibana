/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { checkFullLicense } from '../../../license';
import {
  checkGetJobsCapabilitiesResolver,
  checkPermission,
} from '../../../capabilities/check_capabilities';
import { NewCalendar } from '../../../settings/calendars';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { getMlNodeCount } from '../../../ml_nodes_check';

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
  path: createPath(ML_PAGES.CALENDARS_NEW),
  title: i18n.translate('xpack.ml.settings.createCalendar.docTitle', {
    defaultMessage: 'Create Calendar',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.NEW} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CALENDAR_MANAGEMENT_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.createLabel', {
        defaultMessage: 'Create',
      }),
    },
  ],
});

export const editCalendarRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_EDIT, '/:calendarId'),
  title: i18n.translate('xpack.ml.settings.editCalendar.docTitle', {
    defaultMessage: 'Edit Calendar',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.EDIT} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CALENDAR_MANAGEMENT_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.editLabel', {
        defaultMessage: 'Edit',
      }),
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

  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {
      checkFullLicense,
      checkGetJobsCapabilities: () =>
        checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
      getMlNodeCount,
    }
  );

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const canCreateCalendar = checkPermission('canCreateCalendar');
  const canDeleteCalendar = checkPermission('canDeleteCalendar');

  return (
    <PageLoader context={context}>
      <NewCalendar {...{ calendarId, canCreateCalendar, canDeleteCalendar }} />
    </PageLoader>
  );
};
