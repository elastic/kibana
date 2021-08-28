/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { Suspense } from 'react';
import { Redirect } from 'react-router-dom';
import { checkGetJobsCapabilitiesResolver } from '../../capabilities/check_capabilities';
import type { NavigateToPath } from '../../contexts/kibana/use_navigate_to_path';
import { useTimefilter } from '../../contexts/kibana/use_timefilter';
import { checkFullLicense } from '../../license/check_license';
import { getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { breadcrumbOnClickFactory, getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import type { MlRoute, PageProps } from '../router';
import { PageLoader } from '../router';
import { useResolver } from '../use_resolver';

const OverviewPage = React.lazy(() => import('../../overview/overview_page'));

export const overviewRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/overview',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.overview.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      onClick: breadcrumbOnClickFactory('/overview', navigateToPath),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, {
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
  path: '/',
  render: () => <Page />,
  breadcrumbs: [],
});

const Page: FC = () => {
  return <Redirect to="/overview" />;
};
