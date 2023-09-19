/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import React, { FC, Suspense } from 'react';
import { Redirect } from 'react-router-dom';
import { ML_PAGES } from '../../../locator';
import type { NavigateToPath } from '../../contexts/kibana';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { createPath, MlRoute, PageLoader, PageProps } from '../router';
import { useRouteResolver } from '../use_resolver';

const OverviewPage = React.lazy(() => import('../../overview/overview_page'));

export const overviewRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'overview',
  path: createPath(ML_PAGES.OVERVIEW),
  title: i18n.translate('xpack.ml.overview.overviewLabel', {
    defaultMessage: 'Overview',
  }),
  enableDatePicker: true,
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.overview.overviewLabel', {
        defaultMessage: 'Overview',
      }),
    },
  ],
  'data-test-subj': 'mlPageOverview',
});

const PageWrapper: FC<PageProps> = () => {
  const { context } = useRouteResolver('full', ['canGetMlInfo'], {
    getMlNodeCount,
    loadMlServerInfo,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  return (
    <PageLoader context={context}>
      {/* No fallback yet, we don't show a loading spinner on an outer level until context is available either. */}
      <Suspense fallback={null}>
        <OverviewPage />
      </Suspense>
    </PageLoader>
  );
};

export const appRootRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  id: '',
  path: '/',
  render: () => <Page />,
  breadcrumbs: [],
});

const Page: FC = () => {
  return <Redirect to={createPath(ML_PAGES.OVERVIEW)} />;
};
