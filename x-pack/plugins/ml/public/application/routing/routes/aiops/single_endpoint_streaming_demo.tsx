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
import { SingleEndpointStreamingDemoPage as Page } from '../../../aiops/single_endpoint_streaming_demo';

import { checkBasicLicense } from '../../../license';
import { checkGetJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { cacheDataViewsContract } from '../../../util/index_utils';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const singleEndpointStreamingDemoRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'single_endpoint_streaming_demo',
  path: '/aiops/single_endpoint_streaming_demo',
  title: i18n.translate('xpack.ml.aiops.singleEndpointStreamingDemo.docTitle', {
    defaultMessage: 'Single endpoint streaming demo',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.aiopsBreadcrumbs.singleEndpointStreamingDemoLabel', {
        defaultMessage: 'Single endpoint streaming demo',
      }),
    },
  ],
  disabled: !AIOPS_ENABLED,
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, deps.dataViewsContract, {
    checkBasicLicense,
    cacheDataViewsContract: () => cacheDataViewsContract(deps.dataViewsContract),
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
  });

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
