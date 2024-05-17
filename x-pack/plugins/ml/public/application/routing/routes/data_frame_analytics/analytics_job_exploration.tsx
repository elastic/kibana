/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
import { useUrlState } from '@kbn/ml-url-state';
import { dynamic } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React from 'react';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';
import type { MlRoute } from '../../router';
import { PageLoader, createPath } from '../../router';
import { useRouteResolver } from '../../use_resolver';

const Page = dynamic(async () => ({
  default: (await import('../../../data_frame_analytics/pages/analytics_exploration')).Page,
}));

export const analyticsJobExplorationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION),
  render: () => <PageWrapper />,
  title: i18n.translate('xpack.ml.dataFrameAnalytics.exploration.docTitle', {
    defaultMessage: 'Results Explorer',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameExplorationLabel', {
        defaultMessage: 'Results Explorer',
      }),
    },
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetDataFrameAnalytics'], basicResolvers());

  const [globalState] = useUrlState('_g');
  const jobId: string = globalState?.ml.jobId;
  const analysisType: DataFrameAnalysisConfigType = globalState?.ml.analysisType;

  return (
    <PageLoader context={context}>
      <Page {...{ jobId, analysisType }} />
    </PageLoader>
  );
};
