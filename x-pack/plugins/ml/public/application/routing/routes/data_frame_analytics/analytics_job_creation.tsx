/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { DataSourceContextProvider } from '../../../contexts/ml';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath, useMlKibana } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_creation';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import {
  DATA_FRAME_ANALYTICS,
  loadNewJobCapabilities,
} from '../../../services/new_job_capabilities/load_new_job_capabilities';

export const analyticsJobsCreationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  title: i18n.translate('xpack.ml.dataFrameAnalytics.createJob.docTitle', {
    defaultMessage: 'Create Job',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameCreationLabel', {
        defaultMessage: 'Create Job',
      }),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location }) => {
  const { index, jobId, savedSearchId }: Record<string, any> = parse(location.search, {
    sort: false,
  });
  const {
    services: {
      data: { dataViews: dataViewsService },
      savedSearch: savedSearchService,
    },
  } = useMlKibana();

  const { context } = useRouteResolver(
    'full',
    ['canGetDataFrameAnalytics', 'canCreateDataFrameAnalytics'],
    {
      ...basicResolvers(),
      analyticsFields: () =>
        loadNewJobCapabilities(
          index,
          savedSearchId,
          dataViewsService,
          savedSearchService,
          DATA_FRAME_ANALYTICS
        ),
    }
  );

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <Page jobId={jobId} />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
