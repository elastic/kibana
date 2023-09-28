/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { DataDriftPage } from '../../../datavisualizer/data_drift/data_drift_page';
import { DataSourceContextProvider } from '../../../contexts/ml';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import {
  breadcrumbOnClickFactory,
  DATA_DRIFT_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  getBreadcrumbWithUrlForApp,
} from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';

export const dataDriftRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_drift',
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
            href: `${basePath}/app/ml${DATA_DRIFT_BREADCRUMB.href}`,
            onClick: breadcrumbOnClickFactory(DATA_DRIFT_BREADCRUMB.href, navigateToPath),
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
  const { context } = useRouteResolver('full', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <DataDriftPage />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
