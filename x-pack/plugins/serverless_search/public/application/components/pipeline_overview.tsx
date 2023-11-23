/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiSpacer,
  EuiText,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApplicationStart } from '@kbn/core-application-browser';
import { HttpStart } from '@kbn/core-http-browser';

export interface PipelineOverviewProps {
  application: ApplicationStart;
  http: HttpStart;
} 
export const PipelineOverview: React.FC<PipelineOverviewProps> = ({
  application,
  http,
}) => {
  const { navigateToUrl } = application;
  const path = http.basePath.prepend('/app/management/ingest/ingest_pipelines/create');
  
  return (
    <>
      <EuiSpacer />
      <EuiButton
        iconType="plusInCircle"
        size="s"
        onClick={() => navigateToUrl(path)}
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
