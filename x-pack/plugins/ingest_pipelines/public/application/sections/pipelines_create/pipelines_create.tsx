/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

import { BASE_PATH } from '../../../../common/constants';
import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { PipelineForm } from '../../components';
import { PipelineEditor } from '../../pipeline_editor';

export const PipelinesCreate: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
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

    history.push(BASE_PATH);
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('create');
  }, [services]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.create.pageTitle"
              defaultMessage="Create pipeline"
            />
          </h1>
        </EuiTitle>

        <EuiSpacer size="l" />

        {/* TODO: Temporary home for the pipeline editor, move it somewhere else */}
        <PipelineEditor
          onSubmit={() => {
            // TODO do something here
          }}
          pipeline={{
            name: '',
            description: '',
            version: 1,
            processors: [
              {
                set: {
                  field: 'test',
                  value: 'test',
                },
              },
              {
                gsub: {
                  field: '_index',
                  pattern: '(.monitoring-\\w+-)6(-.+)',
                  replacement: '$17$2',
                },
              },
            ],
            onFailure: [],
          }}
        />
        <EuiSpacer size="l" />

        <PipelineForm onSave={onSave} isSaving={isSaving} saveError={saveError} />
      </EuiPageContent>
    </EuiPageBody>
  );
};
