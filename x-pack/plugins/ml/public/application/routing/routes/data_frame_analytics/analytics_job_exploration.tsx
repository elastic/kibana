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
import type { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';
import { useMlKibana } from '../../../contexts/kibana/kibana_context';
import { useMlLocator } from '../../../contexts/kibana/use_create_url';
import type { NavigateToPath } from '../../../contexts/kibana/use_navigate_to_path';
import { Page } from '../../../data_frame_analytics/pages/analytics_exploration/page';
import { useUrlState } from '../../../util/url_state';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

export const analyticsJobExplorationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/data_frame_analytics/exploration',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameExplorationLabel', {
        defaultMessage: 'Exploration',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(undefined, undefined, deps.config, basicResolvers(deps));

  const [globalState] = useUrlState('_g');

  const locator = useMlLocator();
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToAnalyticsManagementPage = async () => {
    if (!locator) return;
    const url = await locator.getUrl({ page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE });
    await navigateToUrl(url);
  };

  const jobId: string = globalState.ml.jobId;
  const analysisType: DataFrameAnalysisConfigType = globalState.ml.analysisType;

  if (!analysisType) {
    redirectToAnalyticsManagementPage();
  }

  return (
    <PageLoader context={context}>
      <Page {...{ jobId, analysisType }} />
    </PageLoader>
  );
};
