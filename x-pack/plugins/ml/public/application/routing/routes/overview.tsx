/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';
import { i18n } from '@kbn/i18n';

import { Redirect } from 'react-router-dom';

import type { NavigateToPath } from '../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';

import { checkFullLicense } from '../../license';
import { checkGetJobsCapabilitiesResolver } from '../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { useTimefilter } from '../../contexts/kibana';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';

const OverviewPage = React.lazy(() => import('../../overview/overview_page'));

export const overviewRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'overview',
  path: '/overview',
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
  return <Redirect to="/overview" />;
};
