/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';

interface Props {
  errorMessage: string;
}

export const PipelineFormError: React.FunctionComponent<Props> = ({ errorMessage }) => {
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.form.savePipelineError"
            defaultMessage="Unable to create pipeline"
          />
        }
        color="danger"
        iconType="alert"
        data-test-subj="savePipelineError"
      >
        <p>{errorMessage}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
