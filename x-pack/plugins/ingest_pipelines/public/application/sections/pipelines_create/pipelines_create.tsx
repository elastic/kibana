/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageHeader, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { getListPath } from '../../services/navigation';
import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { PipelineForm } from '../../components';

interface Props {
  /**
   * This value may be passed in to prepopulate the creation form
   */
  sourcePipeline?: Pipeline;
}

interface LocationState {
  sourcePipeline?: Pipeline;
}

export const PipelinesCreate: React.FunctionComponent<RouteComponentProps & Props> = ({
  sourcePipeline,
}) => {
  const history = useHistory<LocationState>();
  const { services } = useKibana();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const onSave = async (pipeline: Pipeline) => {
    setIsSaving(true);
    setSaveError(null);

    const { error } = await services.api.createPipeline(pipeline);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    history.push(getListPath({ inspectedPipelineName: pipeline.name }));
  };

  const onCancel = () => {
    history.push(getListPath());
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('create');
  }, [services]);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.create.pageTitle"
              defaultMessage="Create pipeline"
            />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={services.documentation.getPutPipelineApiUrl()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.create.docsButtonLabel"
              defaultMessage="Create pipeline docs"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <PipelineForm
        defaultValue={sourcePipeline}
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
        saveError={saveError}
      />
    </>
  );
};
