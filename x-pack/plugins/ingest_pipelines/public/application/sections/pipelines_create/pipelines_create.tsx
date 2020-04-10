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
import { useKibana } from '../../../shared_imports';
import { PipelineForm } from '../../components';

export const PipelinesCreate: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const { services } = useKibana();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const onSave = async (pipeline: any) => {
    // TODO fix TS
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
              defaultMessage="Create a pipeline"
            />
          </h1>
        </EuiTitle>

        <EuiSpacer size="l" />

        <PipelineForm onSave={onSave} isSaving={isSaving} saveError={saveError} />
      </EuiPageContent>
    </EuiPageBody>
  );
};
