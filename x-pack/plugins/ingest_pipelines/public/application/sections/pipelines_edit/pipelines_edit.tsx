/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';

import { EuiCallOut } from '@elastic/eui';
import { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading, attemptToURIDecode } from '../../../shared_imports';

import { getListPath } from '../../services/navigation';
import { PipelineForm } from '../../components';

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

  const decodedPipelineName = attemptToURIDecode(name)!;

  const { error, data: pipeline, isLoading } = services.api.useLoadPipeline(decodedPipelineName);

  const onSave = async (updatedPipeline: Pipeline) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: savePipelineError } = await services.api.updatePipeline(updatedPipeline);

    setIsSaving(false);

    if (savePipelineError) {
      setSaveError(savePipelineError);
      return;
    }

    history.push(getListPath({ inspectedPipelineName: updatedPipeline.name }));
  };

  const onCancel = () => {
    history.push(getListPath());
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('edit');
  }, [services.breadcrumbs]);

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.edit.loadingPipelinesDescription"
          defaultMessage="Loading pipeline…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ingestPipelines.edit.fetchPipelineError"
              defaultMessage="Error loading pipeline"
            />
          }
          color="danger"
          iconType="alert"
          data-test-subj="fetchPipelineError"
        >
          <p>{error.message}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  } else if (pipeline) {
    content = (
      <PipelineForm
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
        saveError={saveError}
        defaultValue={pipeline}
        isEditing={true}
      />
    );
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l" data-test-subj="pageTitle">
                <h1>
                  <FormattedMessage
                    id="xpack.ingestPipelines.edit.pageTitle"
                    defaultMessage="Edit pipeline '{name}'"
                    values={{ name: decodedPipelineName }}
                  />
                </h1>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="right"
                href={services.documentation.getPutPipelineApiUrl()}
                target="_blank"
                iconType="help"
                data-test-subj="documentationLink"
              >
                <FormattedMessage
                  id="xpack.ingestPipelines.edit.docsButtonLabel"
                  defaultMessage="Edit pipeline docs"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>

        <EuiSpacer size="l" />

        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};
