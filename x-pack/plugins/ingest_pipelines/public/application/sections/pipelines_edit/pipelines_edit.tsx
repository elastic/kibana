/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageHeader,
  EuiEmptyPrompt,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';

import { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading, attemptToURIDecode } from '../../../shared_imports';

import { getListPath } from '../../services/navigation';
import { PipelineForm } from '../../components';
import { useRedirectToPathOrRedirectPath } from '../../hooks';

interface MatchParams {
  name: string;
}

const ManagedPipelineCallout = () => (
  <EuiCallOut
    color="danger"
    iconType="alert"
    data-test-subj="managedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.managedCalloutTitle"
        defaultMessage="Editing a managed pipeline can break Kibana."
      />
    }
  >
    <FormattedMessage
      id="xpack.ingestPipelines.edit.managedCalloutDescription"
      defaultMessage="Managed pipelines are critical for internal operations."
    />
  </EuiCallOut>
);

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

  const onCancel = () => {
    redirectToPathOrRedirectPath(getListPath());
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('edit');
  }, [services.breadcrumbs]);

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>
          <FormattedMessage
            id="xpack.ingestPipelines.edit.loadingPipelinesDescription"
            defaultMessage="Loading pipeline…"
          />
        </SectionLoading>
      </EuiPageContent>
    );
  }

  if (error) {
    return (
      <EuiPageContent
        verticalPosition="center"
        horizontalPosition="center"
        color="danger"
        data-test-subj="fetchPipelineError"
      >
        <EuiEmptyPrompt
          iconType="alert"
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
      </EuiPageContent>
    );
  }

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.edit.pageTitle"
              defaultMessage="Edit pipeline '{name}'"
              values={{ name: decodedPipelineName }}
            />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={services.documentation.getCreatePipelineUrl()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.edit.docsButtonLabel"
              defaultMessage="Edit pipeline docs"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />
      {pipeline?.isManaged && (
        <>
          <ManagedPipelineCallout />
          <EuiSpacer size="l" />
        </>
      )}

      <PipelineForm
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
        saveError={saveError}
        defaultValue={pipeline as Pipeline}
        isEditing={true}
      />
    </>
  );
};
