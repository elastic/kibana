/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

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

    // TODO navigate back to list page with flyout open
    // history.push();
  };

  // TODO set breadcrumbs
  // useEffect(() => {
  //   services.setBreadcrumbs([
  //     {
  //       text: i18n.translate('xpack.ingestPipelines.breadcrumbsTitle', {
  //         defaultMessage: 'Ingest Pipelines',
  //       }),
  //     },
  //   ]);
  // }, [services]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestsPipelines.create.pageTitle"
              defaultMessage="Create pipeline"
            />
          </h1>
        </EuiTitle>

        <EuiSpacer size="l" />

        <PipelineForm onSave={onSave} isSaving={isSaving} saveError={saveError} />
      </EuiPageContent>
    </EuiPageBody>
  );
};
