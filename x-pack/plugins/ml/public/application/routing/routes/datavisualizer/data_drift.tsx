/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { DataDriftIndexPatternsPicker } from '../../../datavisualizer/data_comparison/index_patterns_picker';
import { NavigateToPath } from '../../../contexts/kibana';
import { MlRoute } from '../..';
import { createPath, PageLoader, PageProps } from '../../router';
import { ML_PAGES } from '../../../../../common/constants/locator';
import {
  breadcrumbOnClickFactory,
  DATA_COMPARISON_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  getBreadcrumbWithUrlForApp,
} from '../../breadcrumbs';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { DataSourceContextProvider } from '../../../contexts/ml';

export const dataDriftRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_comparison',
  path: createPath(ML_PAGES.DATA_DRIFT),
  title: i18n.translate('xpack.ml.dataVisualizer.dataDrift.docTitle', {
    defaultMessage: 'Data Drift',
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
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.dataDriftLabel', {
        defaultMessage: 'Data Drift',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataDrift',
});

const PageWrapper: FC<PageProps> = () => {
  const { context } = useRouteResolver('basic', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <DataDriftIndexPatternsPicker />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
