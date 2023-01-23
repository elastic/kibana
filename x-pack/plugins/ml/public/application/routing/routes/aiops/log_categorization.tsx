/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { parse } from 'query-string';

import { i18n } from '@kbn/i18n';

import { AIOPS_ENABLED } from '@kbn/aiops-plugin/common';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { LogCategorizationPage as Page } from '../../../aiops/log_categorization';

import { checkBasicLicense } from '../../../license';
import { checkGetJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { cacheDataViewsContract } from '../../../util/index_utils';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const logCategorizationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'log_categorization',
  path: '/aiops/log_categorization',
  title: i18n.translate('xpack.ml.aiops.logCategorization.docTitle', {
    defaultMessage: 'Log Pattern Analysis',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.aiops.logCategorization.docTitle', {
        defaultMessage: 'Log Pattern Analysis',
      }),
    },
  ],
  disabled: !AIOPS_ENABLED,
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(
    index,
    savedSearchId,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {
      checkBasicLicense,
      cacheDataViewsContract: () => cacheDataViewsContract(deps.dataViewsContract),
      checkGetJobsCapabilities: () =>
        checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    }
  );

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
