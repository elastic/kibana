/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut } from '@elastic/eui';

export const ValidationWarningCallout: FC = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.validationStep.validationWarning.title"
          defaultMessage="Validation failed"
        />
      }
      color="warning"
      iconType="alert"
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.validationStep.validationWarning.message"
        defaultMessage="Job validation has failed, however for the advanced wizard it is still possible to continue to create the job.
          Please be aware the this job may encounter problems when running."
      />
    </EuiCallOut>
  );
};
