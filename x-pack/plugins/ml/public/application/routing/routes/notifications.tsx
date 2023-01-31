/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ML_PAGES } from '../../../locator';
import { createPath, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { checkFullLicense } from '../../license';
import { checkGetJobsCapabilitiesResolver } from '../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import type { MlRoute } from '..';
import { NavigateToPath } from '../../contexts/kibana';

const NotificationsPage = React.lazy(() => import('../../notifications/page'));

export const notificationsRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'notifications',
  path: createPath(ML_PAGES.NOTIFICATIONS),
  title: i18n.translate('xpack.ml.notifications.notificationsLabel', {
    defaultMessage: 'Notifications',
  }),
  enableDatePicker: true,
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.overview.notificationsLabel', {
        defaultMessage: 'Notifications',
      }),
    },
  ],
  'data-test-subj': 'mlPageNotifications',
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, deps.dataViewsContract, {
    checkFullLicense,
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    getMlNodeCount,
    loadMlServerInfo,
  });
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  return (
    <PageLoader context={context}>
      <Suspense fallback={null}>
        <NotificationsPage />
      </Suspense>
    </PageLoader>
  );
};
