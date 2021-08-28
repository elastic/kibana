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
import { Page } from '../../../jobs/new_job/pages/job_type/page';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

export const jobTypeRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: '/jobs/new_job/step/job_type',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectJobType', {
        defaultMessage: 'Create job',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, basicResolvers(deps));
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
