/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { decode } from 'rison-node';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_exploration';
import { ANALYSIS_CONFIG_TYPE } from '../../../data_frame_analytics/common/analytics';
import { ML_BREADCRUMB, DATA_FRAME_ANALYTICS_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  DATA_FRAME_ANALYTICS_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameExplorationLabel', {
      defaultMessage: 'Exploration',
    }),
    href: '',
  },
];

export const analyticsJobExplorationRoute: MlRoute = {
  path: '/data_frame_analytics/exploration',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver('', undefined, deps.config, basicResolvers(deps));
  const { _g }: Record<string, any> = parse(location.search, { sort: false });

  let globalState: any = null;
  try {
    globalState = decode(_g);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not parse global state');
    window.location.href = '#data_frame_analytics';
  }
  const jobId: string = globalState.ml.jobId;
  const analysisType: ANALYSIS_CONFIG_TYPE = globalState.ml.analysisType;

  return (
    <PageLoader context={context}>
      <Page {...{ jobId, analysisType }} />
    </PageLoader>
  );
};
