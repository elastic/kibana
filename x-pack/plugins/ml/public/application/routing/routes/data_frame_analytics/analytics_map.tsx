/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';
import { decode } from 'rison-node';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_management';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const analyticsMapRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/data_frame_analytics/map',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.analyticsMapLabel', {
        defaultMessage: 'Analytics Map',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver('', undefined, deps.config, basicResolvers(deps));
  const { _g }: Record<string, any> = parse(location.search, { sort: false });
  let jobId;

  if (_g !== undefined) {
    let globalState: any = null;
    try {
      globalState = decode(_g);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not parse global state');
      window.location.href = '#data_frame_analytics';
    }
    jobId = globalState.ml?.jobId;
  }

  return (
    <PageLoader context={context}>
      <Page jobId={jobId} />
    </PageLoader>
  );
};
