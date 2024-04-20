/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiPageTemplate } from '@elastic/eui';

import { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading, attemptToURIDecode } from '../../../shared_imports';

import { getListPath } from '../../services/navigation';
import { PipelineForm } from '../../components';
import { useRedirectToPathOrRedirectPath } from '../../hooks';

interface MatchParams {
  name: string;
}

export const PipelinesEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const { services } = useKibana();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const redirectToPathOrRedirectPath = useRedirectToPathOrRedirectPath(history);

  const decodedPipelineName = attemptToURIDecode(name)!;

  const {
    error,
    data: pipeline,
    isLoading,
    resendRequest,
  } = services.api.useLoadPipeline(decodedPipelineName);

  const onSave = async (updatedPipeline: Pipeline) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: savePipelineError } = await services.api.updatePipeline(updatedPipeline);

    setIsSaving(false);

    if (savePipelineError) {
      setSaveError(savePipelineError);
      return;
    }

    redirectToPathOrRedirectPath(getListPath({ inspectedPipelineName: updatedPipeline.name }));
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('edit');
  }, [services.breadcrumbs]);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.edit.loadingPipelinesDescription"
          defaultMessage="Loading pipeline…"
        />
      </SectionLoading>
    );
  }

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ingestPipelines.edit.fetchPipelineError"
              defaultMessage="Unable to load '{name}'"
              values={{ name: decodedPipelineName }}
            />
          </h2>
        }
        body={<p>{error.message}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.edit.fetchPipelineReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  }

  return (
    <PipelineForm
      onSave={onSave}
      isSaving={isSaving}
      saveError={saveError}
      defaultValue={pipeline as Pipeline}
      isEditing={true}
    />
  );
};
