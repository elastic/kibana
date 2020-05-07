/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import { Validation } from '../../../../../common/job_validator';

interface Props {
  validation: Validation;
}

export const Description: FC<Props> = memo(({ children, validation }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.jobDetailsStep.jobId.title', {
    defaultMessage: 'Job ID',
  });
  const description = i18n.translate('xpack.ml.newJob.wizard.jobDetailsStep.jobId.description', {
    defaultMessage:
      'A unique identifier for the job. Spaces and the characters  / ? , " < > | * are not allowed',
  });
  return (
    <EuiDescribedFormGroup title={<h3>{title}</h3>} description={description}>
      <EuiFormRow label={title} error={validation.message} isInvalid={validation.valid === false}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
