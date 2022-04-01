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
  return 'body' in error && 'req' in error && 'res' in error && 'response' in error;
};

export interface ObjectContentProps {
  data: object;
}

export const ObjectContent = memo<ObjectContentProps>(({ data }) => {
  return (
    <EuiText size="s">
      {Object.entries(data).map(([key, value]) => {
        return (
          <div key={key} className="eui-textBreakAll">
            <strong>{key}</strong>
            {': '}
            {value}
          </div>
        );
      })}
    </EuiText>
  );
});
ObjectContent.displayName = 'ObjectContent';

export interface FormattedErrorProps {
  error: Error;
  'data-test-subj'?: string;
}

/**
 * A general component for formatting errors. Recognizes different types of errors and displays
 * their information.
 */
export const FormattedError = memo<FormattedErrorProps>(
  ({ error, 'data-test-subj': dataTestSubj }) => {
    return useMemo(() => {
      let content: JSX.Element = <>{error.message}</>;

      if (isHttpFetchError(error)) {
        content = (
          <>
            <div>{`${error.response?.status}: ${error.response?.statusText}`}</div>
            {error.body && <ObjectContent data={error.body} />}
          </>
        );
      }

      return <EuiText data-test-subj={dataTestSubj}>{content}</EuiText>;
    }, [dataTestSubj, error]);
  }
);
FormattedError.displayName = 'FormattedError';
