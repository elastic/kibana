/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  AbortedRequestSearchStrategyError,
  GenericSearchStrategyError,
  SearchStrategyError,
  ShardFailureSearchStrategyError,
} from '../../common/search_strategies/common/errors';

export const DataSearchErrorCallout: React.FC<{
  title: React.ReactNode;
  errors: SearchStrategyError[];
  onRetry?: () => void;
}> = ({ errors, onRetry, title }) => {
  const calloutColor = errors.some((error) => error.type !== 'aborted') ? 'danger' : 'warning';

  return (
    <EuiCallOut color={calloutColor} iconType="alert" title={title}>
      {errors?.map((error, errorIndex) => (
        <DataSearchErrorMessage key={errorIndex} error={error} />
      ))}
      {onRetry ? (
        <EuiButton color={calloutColor} size="s" onClick={onRetry}>
          {loadingErrorRetryButtonLabel}
        </EuiButton>
      ) : null}
    </EuiCallOut>
  );
};

const loadingErrorRetryButtonLabel = i18n.translate(
  'xpack.infra.dataSearch.loadingErrorRetryButtonLabel',
  {
    defaultMessage: 'Retry',
  }
);

const DataSearchErrorMessage: React.FC<{ error: SearchStrategyError }> = ({ error }) => {
  if (error.type === 'aborted') {
    return <AbortedRequestErrorMessage error={error} />;
  } else if (error.type === 'generic') {
    return <GenericErrorMessage error={error} />;
  } else if (error.type === 'shardFailure') {
    return <ShardFailureErrorMessage error={error} />;
  }
  return <p>{`${error}`}</p>;
};

const AbortedRequestErrorMessage: React.FC<{
  error?: AbortedRequestSearchStrategyError;
}> = ({}) => <p>{abortedRequestErrorMessage}</p>;

const GenericErrorMessage: React.FC<{ error: GenericSearchStrategyError }> = ({ error }) => (
  <p>{error.message}</p>
);

const ShardFailureErrorMessage: React.FC<{ error: ShardFailureSearchStrategyError }> = ({
  error,
}) => (
  <p>
    {error.shardInfo.index}: {error.message}
  </p>
);

const abortedRequestErrorMessage = i18n.translate(
  'xpack.infra.dataSearch.abortedRequestErrorMessage',
  {
    defaultMessage: 'The request was aborted.',
  }
);
