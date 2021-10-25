/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  error: { title: string; message: string } | null;
}

export const Error: FC<Props> = ({ error }) => {
  const title = error?.title;
  const details = error?.message;

  return (
    <EuiCallOut title={title} color="danger" iconType="alert" data-test-subj="errorCallout">
      <p>
        <FormattedMessage
          id="xpack.ingestPipelines.createFromCsv.errorMessage"
          defaultMessage="{errorDetails}"
          values={{ details }}
        />
      </p>
    </EuiCallOut>
  );
};
