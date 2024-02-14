/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { LogCategorizationPage as Page } from '../../../aiops/log_categorization';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { DataSourceContextProvider } from '../../../contexts/ml';

export const logCategorizationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'log_categorization',
  path: createPath(ML_PAGES.AIOPS_LOG_CATEGORIZATION),
  title: i18n.translate('xpack.ml.aiops.logCategorization.docTitle', {
    defaultMessage: 'Log Pattern Analysis',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.aiops.logCategorization.docTitle', {
        defaultMessage: 'Log Pattern Analysis',
      }),
    },
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canUseAiops']);

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <Page />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
