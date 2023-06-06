/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { getMlNodeCount } from '../../../ml_nodes_check';
import { loadMlServerInfo } from '../../../services/ml_server_info';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { Page } from '../../../jobs/new_job/pages/job_type';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { loadSavedSearches } from '../../../util/index_utils';

export const jobTypeRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE),
  render: () => <PageWrapper />,
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

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetJobs'], {
    getMlNodeCount,
    loadMlServerInfo,
    loadSavedSearches,
  });

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
