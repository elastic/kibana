/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

export const Description: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.enableModelPlotAnnotations.title',
    {
      defaultMessage: 'Enable model change annotations',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.enableModelPlotAnnotations.description"
          defaultMessage="Select to generate annotations when the model changes significantly. For example, when step changes, periodicity or trends are detected."
        />
      }
    >
      <EuiFormRow label={title}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
