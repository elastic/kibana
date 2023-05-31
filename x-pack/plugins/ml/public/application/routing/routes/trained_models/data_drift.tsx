/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';
import { cacheDataViewsContract } from '../../../util/index_utils';
import { checkBasicLicense } from '../../../license';
import { DataDriftWithDocCountPage } from '../../../aiops/data_drift';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const dataDriftRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_drift',
  path: createPath(ML_PAGES.DATA_DRIFT),
  title: i18n.translate('xpack.ml.modelManagement.dataDrift.docTitle', {
    defaultMessage: 'Data Drift',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('TRAINED_MODELS', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.dataDriftLabel', {
        defaultMessage: 'Data Drift',
      }),
    },
  ],
  'data-test-subj': 'mlPageModelManagement',
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, deps.dataViewsContract, {
    checkBasicLicense,
    cacheDataViewsContract: () => cacheDataViewsContract(deps.dataViewsContract),
  });
  console.log(`--@@context`, context);

  return (
    <PageLoader context={context}>
      <DataDriftWithDocCountPage />
    </PageLoader>
  );
};
