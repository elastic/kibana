/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiText, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useKibanaServices } from '../hooks/use_kibana';

export const PipelineButtonOverview: React.FC = () => {
  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  return (
    <>
      <EuiSpacer />
      <EuiButton
        iconType="plusInCircle"
        size="s"
        onClick={() => navigateToUrl('/app/management/ingest/ingest_pipelines/create')}
        data-test-subj="create-a-pipeline-button"
      >
        <EuiText size="s">
          {i18n.translate('xpack.serverlessSearch.pipeline.description.createButtonLabel', {
            defaultMessage: 'Create a pipeline',
          })}
        </EuiText>
      </EuiButton>
    </>
  );
};
