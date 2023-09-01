/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { basicResolvers } from '../resolvers';
import { ML_PAGES } from '../../../locator';
import { NavigateToPath } from '../../contexts/kibana';
import { createPath, MlRoute, PageLoader } from '../router';
import { useRouteResolver } from '../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { MemoryUsagePage } from '../../memory_usage';

export const nodesListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.MEMORY_USAGE),
  render: () => <PageWrapper />,
  title: i18n.translate('xpack.ml.modelManagement.memoryUsage.docTitle', {
    defaultMessage: 'Memory Usage',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.nodeOverviewLabel', {
        defaultMessage: 'Memory Usage',
      }),
    },
  ],
  enableDatePicker: true,
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetMlInfo'], basicResolvers());

  return (
    <PageLoader context={context}>
      <MemoryUsagePage />
    </PageLoader>
  );
};
