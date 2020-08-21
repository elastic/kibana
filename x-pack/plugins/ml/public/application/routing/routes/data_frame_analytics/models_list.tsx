/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_management';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const modelsListRouteFactory = (navigateToPath: NavigateToPath): MlRoute => ({
  path: '/data_frame_analytics/models',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.modelsListLabel', {
        defaultMessage: 'Model Management',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver('', undefined, deps.config, basicResolvers(deps));
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
