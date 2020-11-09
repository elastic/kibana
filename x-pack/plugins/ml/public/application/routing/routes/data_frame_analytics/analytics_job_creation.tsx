/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { parse } from 'query-string';

import { i18n } from '@kbn/i18n';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_creation';
import { breadcrumbOnClickFactory, getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { loadNewJobCapabilities } from '../../../services/new_job_capabilities_service';

export const analyticsJobsCreationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/data_frame_analytics/new_job',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameManagementLabel', {
        defaultMessage: 'Data Frame Analytics',
      }),
      onClick: breadcrumbOnClickFactory('/data_frame_analytics', navigateToPath),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, jobId, savedSearchId }: Record<string, any> = parse(location.search, {
    sort: false,
  });

  const { context } = useResolver(index, savedSearchId, deps.config, {
    ...basicResolvers(deps),
    jobCaps: () => loadNewJobCapabilities(index, savedSearchId, deps.indexPatterns),
  });

  return (
    <PageLoader context={context}>
      <Page jobId={jobId} />
    </PageLoader>
  );
};
