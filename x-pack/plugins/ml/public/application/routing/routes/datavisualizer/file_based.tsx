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
import { FileDataVisualizerPage } from '../../../datavisualizer/file_based';

import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { cacheDataViewsContract } from '../../../util/index_utils';

import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const fileBasedRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'filedatavisualizer',
  path: createPath(ML_PAGES.DATA_VISUALIZER_FILE),
  title: i18n.translate('xpack.ml.dataVisualizer.file.docTitle', {
    defaultMessage: 'File Data Visualizer',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataVisualizer.fileBasedLabel', {
        defaultMessage: 'File',
      }),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {
      checkBasicLicense,
      cacheDataViewsContract: () => cacheDataViewsContract(deps.dataViewsContract),
      checkFindFileStructurePrivilege: () =>
        checkFindFileStructurePrivilegeResolver(redirectToMlAccessDeniedPage),
    }
  );

  return (
    <PageLoader context={context}>
      <FileDataVisualizerPage />
    </PageLoader>
  );
};
