/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHANGE_POINT_DETECTION_ENABLED } from '@kbn/aiops-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { parse } from 'query-string';
import { NavigateToPath } from '../../../contexts/kibana';
import { MlRoute } from '../..';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { checkBasicLicense } from '../../../license';
import { cacheDataViewsContract } from '../../../util/index_utils';
import { ChangePointDetectionPage as Page } from '../../../aiops';

export const changePointDetectionRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'change_point_detection',
  path: '/aiops/change_point_detection',
  title: i18n.translate('xpack.ml.aiops.changePointDetection.docTitle', {
    defaultMessage: 'Change point detection',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.aiopsBreadcrumbs.changePointDetectionLabel', {
        defaultMessage: 'Change point detection',
      }),
    },
  ],
  disabled: !CHANGE_POINT_DETECTION_ENABLED,
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
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
    }
  );

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
