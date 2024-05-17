/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';

export const Error: React.FunctionComponent<{
  title: JSX.Element;
  error: Error | string;
}> = ({ title, error }) => {
  return (
    <EuiCallOut title={title} color="danger" iconType="warning">
      <p>{typeof error === 'string' ? error : error.message}</p>
    </EuiCallOut>
  );
};
