/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { parse } from 'query-string';
import { checkBasicLicense } from '../../../license';
import { DataDriftWithDocCountPage } from '../../../aiops/data_drift';
import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { MlPageHeader } from '../../../components/page_header';

export const dataDriftRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_drift',
  path: createPath(ML_PAGES.DATA_DRIFT),
  title: i18n.translate('xpack.ml.modelManagement.trainedModels.docTitle', {
    defaultMessage: 'Data Drift',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_DRIFT_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.trainedModelsLabel', {
        defaultMessage: 'Data Drift',
      }),
    },
  ],
  enableDatePicker: true,
  'data-test-subj': 'mlPageModelManagement',
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(
    index,
    savedSearchId,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {
      checkBasicLicense,
    }
  );

  return (
    <PageLoader context={context}>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.modelManagement.trainedModelsHeader"
              defaultMessage="Data Drift"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <DataDriftWithDocCountPage />
    </PageLoader>
  );
};
