/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { parse } from 'query-string';

import { i18n } from '@kbn/i18n';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { Page } from '../../../datavisualizer/index_based';

import { checkBasicLicense } from '../../../license';
import { checkGetJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { loadIndexPatterns } from '../../../util/index_utils';
import { checkMlNodesAvailable } from '../../../ml_nodes_check';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const indexBasedRouteFactory = (navigateToPath: NavigateToPath): MlRoute => ({
  path: '/jobs/new_job/datavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.indexLabel', {
        defaultMessage: 'Index',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkGetJobsCapabilities: checkGetJobsCapabilitiesResolver,
    checkMlNodesAvailable,
  });

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
