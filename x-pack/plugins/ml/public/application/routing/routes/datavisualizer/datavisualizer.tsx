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
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { DatavisualizerSelector } from '../../../datavisualizer';
import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const selectorRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'datavisualizer',
  path: createPath(ML_PAGES.DATA_VISUALIZER),
  title: i18n.translate('xpack.ml.dataVisualizer.docTitle', {
    defaultMessage: 'Data Visualizer',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB'),
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {
      checkBasicLicense,
      checkFindFileStructurePrivilege: () =>
        checkFindFileStructurePrivilegeResolver(redirectToMlAccessDeniedPage),
    }
  );
  return (
    <PageLoader context={context}>
      <DatavisualizerSelector />
    </PageLoader>
  );
};
