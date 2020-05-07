/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';

export const Description: FC = memo(({ children }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.datafeedStep.query.title', {
    defaultMessage: 'Elasticsearch query',
  });
  return (
    <EuiFormRow label={title} describedByIds={['description']} fullWidth={true}>
      <>{children}</>
    </EuiFormRow>
  );
});
