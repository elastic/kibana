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
import { NavigateToPath } from '../../../contexts/kibana';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { ModelsList } from '../../../trained_models/models_management';
import { MlPageHeader } from '../../../components/page_header';
import { TechnicalPreviewBadge } from '../../../components/technical_preview_badge';

export const modelsListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'trained_models',
  path: '/trained_models',
  title: i18n.translate('xpack.ml.modelManagement.trainedModels.docTitle', {
    defaultMessage: 'Trained Models',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('TRAINED_MODELS', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.trainedModelsLabel', {
        defaultMessage: 'Trained Models',
      }),
    },
  ],
  enableDatePicker: true,
  'data-test-subj': 'mlPageModelManagement',
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    basicResolvers(deps)
  );
  return (
    <PageLoader context={context}>
      <ModelsList />
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.modelManagement.trainedModelsHeader"
              defaultMessage="Trained Models"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
    </PageLoader>
  );
};
