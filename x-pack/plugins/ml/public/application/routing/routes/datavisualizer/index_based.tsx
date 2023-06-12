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
import { createPath, MlRoute, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { IndexDataVisualizerPage as Page } from '../../../datavisualizer/index_based/index_data_visualizer';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { DataSourceContextProvider } from '../../../contexts/ml';

export const indexBasedRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_view_datavisualizer',
  path: createPath(ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER),
  title: i18n.translate('xpack.ml.dataVisualizer.dataView.docTitle', {
    defaultMessage: 'Index Data Visualizer',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataViewLabel', {
        defaultMessage: 'Data View',
      }),
    },
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('basic', []);

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <Page />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
