/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import type { HttpFetchError } from 'kibana/public';

const isHttpFetchError = (error: Error | HttpFetchError): error is HttpFetchError => {
  return 'body' in error && 'req' in error && 'res' in error;
};

export interface FormattedErrorProps {
  error: Error;
}

/**
 * A general component for formatting errors. Recognizes different types of errors and displays
 * their information.
 */
export const FormattedError = memo<FormattedErrorProps>(({ error }) => {
  return useMemo(() => {
    if (isHttpFetchError(error)) {
      return (
        <EuiText>
          <div>{`${error.response?.status}: ${error.response?.statusText}`}</div>
          <div>{error.body.message}</div>
        </EuiText>
      );
    }

    return <EuiText>{error.message}</EuiText>;
  }, [error]);
});
FormattedError.displayName = 'FormattedError';
