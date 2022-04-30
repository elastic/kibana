/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { NavigateToPath, useNavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../jobs/new_job/recognize';
import { checkViewOrCreateJobs } from '../../../jobs/new_job/recognize/resolvers';
import { mlJobService } from '../../../services/job_service';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { useCreateADLinks } from '../../../components/custom_hooks/use_create_ad_links';

export const recognizeRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/jobs/new_job/recognize',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('CREATE_JOB_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabelRecognize', {
        defaultMessage: 'Recognized index',
      }),
      href: '',
    },
  ],
});

export const checkViewOrCreateRouteFactory = (): MlRoute => ({
  path: '/modules/check_view_or_create',
  render: (props, deps) => <CheckViewOrCreateWrapper {...props} deps={deps} />,
  // no breadcrumbs since it's just a redirect
  breadcrumbs: [],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { id, index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context, results } = useResolver(
    index,
    savedSearchId,
    deps.config,
    deps.dataViewsContract,
    {
      ...basicResolvers(deps),
      existingJobsAndGroups: mlJobService.getJobAndGroupIds,
    }
  );

  return (
    <PageLoader context={context}>
      <Page moduleId={id} existingGroupIds={results.existingJobsAndGroups.groupIds} />
    </PageLoader>
  );
};

const CheckViewOrCreateWrapper: FC<PageProps> = ({ location, deps }) => {
  const { id: moduleId, index: dataViewId }: Record<string, any> = parse(location.search, {
    sort: false,
  });
  const { createLinkWithUserDefaults } = useCreateADLinks();

  const navigateToPath = useNavigateToPath();

  // the single resolver checkViewOrCreateJobs redirects only. so will always reject
  useResolver(undefined, undefined, deps.config, deps.dataViewsContract, {
    checkViewOrCreateJobs: () =>
      checkViewOrCreateJobs(moduleId, dataViewId, createLinkWithUserDefaults, navigateToPath),
  });
  return null;
};
