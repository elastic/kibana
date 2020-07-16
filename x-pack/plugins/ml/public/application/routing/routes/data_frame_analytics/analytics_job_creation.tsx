/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { parse } from 'query-string';

import { i18n } from '@kbn/i18n';

import { ApplicationStart } from 'kibana/public';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_creation';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const analyticsJobsCreationRouteFactory = (
  getUrlForApp: ApplicationStart['getUrlForApp']
): MlRoute => ({
  path: '/data_frame_analytics/new_job',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', getUrlForApp),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameManagementLabel', {
        defaultMessage: 'Data Frame Analytics',
      }),
      href: getUrlForApp('ml', { path: '/data_frame_analytics' }),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, jobId, savedSearchId }: Record<string, any> = parse(location.search, {
    sort: false,
  });

  const { context } = useResolver(index, savedSearchId, deps.config, basicResolvers(deps));

  return (
    <PageLoader context={context}>
      <Page jobId={jobId} />
    </PageLoader>
  );
};
