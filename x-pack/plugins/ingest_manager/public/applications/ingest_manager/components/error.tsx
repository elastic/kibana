/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';

export const Error: React.FunctionComponent<{
  title: JSX.Element;
  error: Error | string;
}> = ({ title, error }) => {
  return (
    <EuiCallOut title={title} color="danger" iconType="alert">
      <p>{typeof error === 'string' ? error : error.message}</p>
    </EuiCallOut>
  );
};
