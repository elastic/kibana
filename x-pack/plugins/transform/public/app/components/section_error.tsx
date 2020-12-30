/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';

interface Props {
  title: React.ReactNode;
  error: Error | null;
  actions?: JSX.Element;
}

export const SectionError: React.FunctionComponent<Props> = ({
  title,
  error,
  actions,
  ...rest
}) => {
  const errorMessage = error?.message ?? JSON.stringify(error, null, 2);

  return (
    <EuiCallOut title={title} color="danger" iconType="alert" {...rest}>
      <pre>{errorMessage}</pre>
      {actions ? actions : null}
    </EuiCallOut>
  );
};
