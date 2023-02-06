/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { ML_PAGES } from '../../../../locator';
import { NavigateToPath, useMlKibana } from '../../../contexts/kibana';

import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
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
      defaultMessage: 'Select Data View',
    }),
  },
];

const getExplainLogRateSpikesBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_EXPLAIN_LOG_RATE_SPIKES', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('EXPLAIN_LOG_RATE_SPIKES', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.aiopsBreadcrumbs.selectDataViewLabel', {
      defaultMessage: 'Select Data View',
    }),
  },
];

const getLogCategorizationBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('LOG_PATTERN_ANALYSIS', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.aiopsBreadcrumbs.selectDataViewLabel', {
      defaultMessage: 'Select Data View',
    }),
  },
];

const getChangePointDetectionBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('CHANGE_POINT_DETECTION', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.aiopsBreadcrumbs.selectDataViewLabel', {
      defaultMessage: 'Select Data View',
    }),
  },
];

export const indexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE)}
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
  path: createPath(ML_PAGES.DATA_VISUALIZER_INDEX_SELECT),
  title: i18n.translate('xpack.ml.selectDataViewLabel', {
    defaultMessage: 'Select Data View',
  }),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER)}
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs: getDataVisBreadcrumbs(navigateToPath, basePath),
});

export const explainLogRateSpikesIndexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_view_explain_log_rate_spikes',
  path: createPath(ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT),
  title: i18n.translate('xpack.ml.selectDataViewLabel', {
    defaultMessage: 'Select Data View',
  }),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES)}
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs: getExplainLogRateSpikesBreadcrumbs(navigateToPath, basePath),
});

export const logCategorizationIndexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_view_log_categorization',
  path: createPath(ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT),
  title: i18n.translate('xpack.ml.selectDataViewLabel', {
    defaultMessage: 'Select Data View',
  }),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.AIOPS_LOG_CATEGORIZATION)}
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs: getLogCategorizationBreadcrumbs(navigateToPath, basePath),
});

export const changePointDetectionIndexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_view_change_point_detection',
  path: createPath(ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT),
  title: i18n.translate('xpack.ml.selectDataViewLabel', {
    defaultMessage: 'Select Data View',
  }),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.AIOPS_CHANGE_POINT_DETECTION)}
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs: getChangePointDetectionBreadcrumbs(navigateToPath, basePath),
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
