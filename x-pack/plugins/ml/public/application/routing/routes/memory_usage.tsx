/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '../../../locator';
import { NavigateToPath } from '../../contexts/kibana';
import { MlRoute, PageLoader, PageProps, createPath } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { MemoryUsagePage } from '../../memory_usage';

export const nodesListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.MEMORY_USAGE),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
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

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    basicResolvers(deps)
  );

  return (
    <PageLoader context={context}>
      <MemoryUsagePage />
    </PageLoader>
  );
};
