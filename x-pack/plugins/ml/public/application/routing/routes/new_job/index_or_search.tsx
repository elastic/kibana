/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { NavigateToPath, useMlKibana } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page, preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { checkBasicLicense } from '../../../license';
import { cacheDataViewsContract } from '../../../util/index_utils';
import { checkGetJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';

enum MODE {
  NEW_JOB,
  DATAVISUALIZER,
}

interface IndexOrSearchPageProps extends PageProps {
  nextStepPath: string;
  mode: MODE;
}

const getBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.createJobLabel', {
      defaultMessage: 'Create job',
    }),
  },
];

const getDataVisBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectDateViewLabel', {
      defaultMessage: 'Data View',
    }),
  },
];

export const indexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/jobs/new_job/step/index_or_search',
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath="/jobs/new_job/step/job_type"
      deps={deps}
      mode={MODE.NEW_JOB}
    />
  ),
  breadcrumbs: getBreadcrumbs(navigateToPath, basePath),
});

export const dataVizIndexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_view_datavisualizer',
  path: '/datavisualizer_index_select',
  title: i18n.translate('xpack.ml.selectDataViewLabel', {
    defaultMessage: 'Select Data View',
  }),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath="/jobs/new_job/datavisualizer"
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs: getDataVisBreadcrumbs(navigateToPath, basePath),
});

const PageWrapper: FC<IndexOrSearchPageProps> = ({ nextStepPath, deps, mode }) => {
  const {
    services: {
      http: { basePath },
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const { redirectToMlAccessDeniedPage } = deps;

  const newJobResolvers = {
    ...basicResolvers(deps),
    preConfiguredJobRedirect: () =>
      preConfiguredJobRedirect(deps.dataViewsContract, basePath.get(), navigateToUrl),
  };
  const dataVizResolvers = {
    checkBasicLicense,
    cacheDataViewsContract: () => cacheDataViewsContract(deps.dataViewsContract),
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
  };

  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    mode === MODE.NEW_JOB ? newJobResolvers : dataVizResolvers
  );
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath }} />
    </PageLoader>
  );
};
