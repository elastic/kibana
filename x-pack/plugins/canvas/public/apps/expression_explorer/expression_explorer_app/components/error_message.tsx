/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiCallOut } from '@elastic/eui';

export const ErrorMessage: FC<{ error: Error }> = ({ error }) => {
  if (!error) {
    return null;
  }

  return (
    <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
      <p>{error.message}</p>
    </EuiCallOut>
  );
};
