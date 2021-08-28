/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { checkGetJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { useMlKibana } from '../../../contexts/kibana/kibana_context';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';
import type { NavigateToPath } from '../../../contexts/kibana/use_navigate_to_path';
import { Page } from '../../../jobs/new_job/pages/index_or_search/page';
import { preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search/preconfigured_job_redirect';
import { checkBasicLicense } from '../../../license/check_license';
import { checkMlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { loadIndexPatterns } from '../../../util/index_utils';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

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
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabel', {
      defaultMessage: 'Create job',
    }),
    href: '',
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
  path: '/datavisualizer_index_select',
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath="/jobs/new_job/datavisualizer"
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs: getBreadcrumbs(navigateToPath, basePath),
});

const PageWrapper: FC<IndexOrSearchPageProps> = ({ nextStepPath, deps, mode }) => {
  const {
    services: {
      http: { basePath },
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const { redirectToMlAccessDeniedPage } = deps;
  const redirectToJobsManagementPage = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE
  );

  const newJobResolvers = {
    ...basicResolvers(deps),
    preConfiguredJobRedirect: () =>
      preConfiguredJobRedirect(deps.indexPatterns, basePath.get(), navigateToUrl),
  };
  const dataVizResolvers = {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    checkMlNodesAvailable: () => checkMlNodesAvailable(redirectToJobsManagementPage),
  };

  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    mode === MODE.NEW_JOB ? newJobResolvers : dataVizResolvers
  );
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath }} />
    </PageLoader>
  );
};
