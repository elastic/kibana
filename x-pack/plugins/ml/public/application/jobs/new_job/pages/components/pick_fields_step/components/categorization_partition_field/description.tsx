/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup } from '@elastic/eui';

interface Props {
  children: React.ReactNode;
}
export const Description: FC<Props> = memo(({ children }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.perPartitionCategorization.enable.title', {
    defaultMessage: 'Enable per-partition categorization',
  });
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.perPartitionCategorization.enable.description"
          defaultMessage="If per-partition categorization is enabled then categories are determined independently for each value of the partition field."
        />
      }
    >
      <>{children}</>
    </EuiDescribedFormGroup>
  );
});
