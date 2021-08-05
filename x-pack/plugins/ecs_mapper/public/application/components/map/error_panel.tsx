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
  error: string;
}

export const ErrorPanel: FC<Props> = ({ error }) => {
  return (
    <EuiCallOut title="Something went wrong" color="danger" iconType="alert">
      <p>
        <FormattedMessage
          id="xpack.ecsMapper.results.errorMessage"
          defaultMessage="{error}"
          values={{ error }}
        />
      </p>
    </EuiCallOut>
  );
};
