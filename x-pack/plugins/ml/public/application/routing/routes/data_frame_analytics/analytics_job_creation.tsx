/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';
import type { FC } from 'react';
import React from 'react';
import type { NavigateToPath } from '../../../contexts/kibana/use_navigate_to_path';
import { Page } from '../../../data_frame_analytics/pages/analytics_creation/page';
import {
  DATA_FRAME_ANALYTICS,
  loadNewJobCapabilities,
} from '../../../services/new_job_capabilities/load_new_job_capabilities';
import { breadcrumbOnClickFactory, getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

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
    analyticsFields: () =>
      loadNewJobCapabilities(index, savedSearchId, deps.indexPatterns, DATA_FRAME_ANALYTICS),
  });

  return (
    <PageLoader context={context}>
      <Page jobId={jobId} />
    </PageLoader>
  );
};
