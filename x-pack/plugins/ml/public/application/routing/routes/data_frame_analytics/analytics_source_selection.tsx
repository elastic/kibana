/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';

import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/source_selection';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const analyticsSourceSelectionRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  title: i18n.translate('xpack.ml.dataFrameAnalytics.sourceSelection.docTitle', {
    defaultMessage: 'Source Selection',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameSourceSelectionLabel', {
        defaultMessage: 'Source Selection',
      }),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
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
