/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_creation';
import { ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameManagementLabel', {
      defaultMessage: 'Data Frame Analytics',
    }),
    href: '#/data_frame_analytics',
  },
];

export const analyticsJobsCreationRoute: MlRoute = {
  path: '/data_frame_analytics/new_job',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

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
