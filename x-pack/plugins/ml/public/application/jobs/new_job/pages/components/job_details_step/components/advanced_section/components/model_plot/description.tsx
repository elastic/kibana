/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

export const Description: FC<PropsWithChildren<unknown>> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.enableModelPlot.title',
    {
      defaultMessage: 'Enable model plot',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.enableModelPlot.description"
          defaultMessage="Store additional model information used for plotting model bounds. This adds overhead to the system performance. Not recommended for high cardinality data."
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
