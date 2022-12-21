/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  error: { title: string; message: string };
}

export const Error: FC<Props> = ({ error }) => {
  return (
    <EuiCallOut title={error.title} color="danger" iconType="alert" data-test-subj="errorCallout">
      <p>
        <FormattedMessage
          id="xpack.ingestPipelines.createFromCsv.errorMessage"
          defaultMessage="{message}"
          values={{
            message: error.message,
          }}
        />
      </p>
    </EuiCallOut>
  );
};
