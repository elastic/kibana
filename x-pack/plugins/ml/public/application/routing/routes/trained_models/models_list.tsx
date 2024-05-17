/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React from 'react';
import { ML_PAGES } from '../../../../locator';
import { MlPageHeader } from '../../../components/page_header';
import type { NavigateToPath } from '../../../contexts/kibana';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { basicResolvers } from '../../resolvers';
import type { MlRoute } from '../../router';
import { PageLoader, createPath } from '../../router';
import { useRouteResolver } from '../../use_resolver';

const ModelsList = dynamic(async () => ({
  default: (await import('../../../model_management/models_list')).ModelsList,
}));

export const modelsListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'trained_models',
  path: createPath(ML_PAGES.TRAINED_MODELS_MANAGE),
  title: i18n.translate('xpack.ml.modelManagement.trainedModels.docTitle', {
    defaultMessage: 'Trained Models',
  }),
  render: () => <PageWrapper />,
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

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetTrainedModels'], basicResolvers());

  return (
    <PageLoader context={context}>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.modelManagement.trainedModelsHeader"
              defaultMessage="Trained Models"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <ModelsList />
    </PageLoader>
  );
};
