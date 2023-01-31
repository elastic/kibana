/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { parse } from 'query-string';

import { i18n } from '@kbn/i18n';

import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';

import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../jobs/new_job/pages/job_type';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const jobTypeRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE),
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
  const { context } = useResolver(
    index,
    savedSearchId,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    basicResolvers(deps)
  );
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
