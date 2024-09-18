/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useKibanaServices } from '../hooks/use_kibana';

export const PipelineManageButton: React.FC = () => {
  const { http } = useKibanaServices();

  return (
    <>
      <EuiSpacer />
      <EuiButtonEmpty
        size="m"
        href={http.basePath.prepend('/app/management/ingest/ingest_pipelines')}
        data-test-subj="manage-pipeline-button"
      >
        <EuiText size="s">
          {i18n.translate('xpack.serverlessSearch.pipeline.description.manageButtonLabel', {
            defaultMessage: 'Manage pipeline',
          })}
        </EuiText>
      </EuiButtonEmpty>
    </>
  );
};
