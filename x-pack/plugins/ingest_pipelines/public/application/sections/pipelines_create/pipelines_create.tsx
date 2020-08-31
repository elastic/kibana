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
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

import { BASE_PATH } from '../../../../common/constants';
import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { PipelineForm } from '../../components';

interface Props {
  /**
   * This value may be passed in to prepopulate the creation form
   */
  sourcePipeline?: Pipeline;
}

export const PipelinesCreate: React.FunctionComponent<RouteComponentProps & Props> = ({
  history,
  sourcePipeline,
}) => {
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

    history.push(BASE_PATH + `?pipeline=${encodeURIComponent(pipeline.name)}`);
  };

  const onCancel = () => {
    history.push(BASE_PATH);
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('create');
  }, [services]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l" data-test-subj="pageTitle">
                <h1>
                  <FormattedMessage
                    id="xpack.ingestPipelines.create.pageTitle"
                    defaultMessage="Create pipeline"
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
                  id="xpack.ingestPipelines.create.docsButtonLabel"
                  defaultMessage="Create pipeline docs"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>

        <EuiSpacer size="l" />

        <PipelineForm
          defaultValue={sourcePipeline}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
          saveError={saveError}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
