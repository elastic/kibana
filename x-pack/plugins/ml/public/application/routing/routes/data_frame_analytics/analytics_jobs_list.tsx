/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_management';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const analyticsJobsListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_frame_analytics',
  path: createPath(ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE),
  title: i18n.translate('xpack.ml.dataFrameAnalytics.jobs.docTitle', {
    defaultMessage: 'Data Frame Analytics Jobs',
  }),
  render: () => <PageWrapper />,
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

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetDataFrameAnalytics'], basicResolvers());
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
