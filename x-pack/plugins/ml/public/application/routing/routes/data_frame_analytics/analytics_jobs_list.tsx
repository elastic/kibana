/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { NavigateToPath } from '../../../contexts/kibana';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_management';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const analyticsJobsListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_frame_analytics',
  path: '/data_frame_analytics',
  title: i18n.translate('xpack.ml.dataFrameAnalytics.jobs.docTitle', {
    defaultMessage: 'Data Frame Analytics Jobs',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.jobsManagementLabel', {
        defaultMessage: 'Jobs',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataFrameAnalytics',
  enableDatePicker: true,
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    basicResolvers(deps)
  );
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
