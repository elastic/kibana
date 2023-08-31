/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { DataSourceContextProvider } from '../../../contexts/ml';
import { DataComparisonPage } from '../../../datavisualizer/data_comparison/data_comparison_page';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import {
  breadcrumbOnClickFactory,
  DATA_COMPARISON_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  getBreadcrumbWithUrlForApp,
} from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';

export const dataComparisonRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_comparison',
  path: createPath(ML_PAGES.DATA_COMPARISON),
  title: i18n.translate('xpack.ml.dataVisualizer.dataComparison.docTitle', {
    defaultMessage: 'Data Comparison',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: DATA_VISUALIZER_BREADCRUMB.text,
      ...(navigateToPath
        ? {
            href: `${basePath}/app/ml${DATA_COMPARISON_BREADCRUMB.href}`,
            onClick: breadcrumbOnClickFactory(DATA_COMPARISON_BREADCRUMB.href, navigateToPath),
          }
        : {}),
    },
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.dataComparisonLabel', {
        defaultMessage: 'Data Comparison',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataComparison',
});

const PageWrapper: FC<PageProps> = () => {
  const { context } = useRouteResolver('basic', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <DataComparisonPage />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
