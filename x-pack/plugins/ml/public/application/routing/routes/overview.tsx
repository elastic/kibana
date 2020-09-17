/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { Redirect } from 'react-router-dom';

import { NavigateToPath } from '../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { OverviewPage } from '../../overview';

import { checkFullLicense } from '../../license';
import { checkGetJobsCapabilitiesResolver } from '../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { useTimefilter } from '../../contexts/kibana';
import { breadcrumbOnClickFactory, getBreadcrumbWithUrlForApp } from '../breadcrumbs';

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
      <OverviewPage />
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
