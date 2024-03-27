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
import { FileDataVisualizerPage } from '../../../datavisualizer/file_based';

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
  render: () => <PageWrapper />,
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

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('basic', ['canFindFileStructure']);

  return (
    <PageLoader context={context}>
      <FileDataVisualizerPage />
    </PageLoader>
  );
};
