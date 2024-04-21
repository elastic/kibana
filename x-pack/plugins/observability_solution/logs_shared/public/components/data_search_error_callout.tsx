/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  AbortedRequestSearchStrategyError,
  GenericSearchStrategyError,
  SearchStrategyError,
  ShardFailureSearchStrategyError,
} from '../../common/search_strategies/common/errors';

export const DataSearchErrorCallout = ({
  errors,
  onRetry,
  title,
}: {
  title: React.ReactNode;
  errors: SearchStrategyError[];
  onRetry?: () => void;
}) => {
  const calloutColor = errors.some((error) => error.type !== 'aborted') ? 'danger' : 'warning';

  return (
    <EuiCallOut color={calloutColor} iconType="warning" title={title}>
      {errors?.map((error, errorIndex) => (
        <DataSearchErrorMessage key={errorIndex} error={error} />
      ))}
      {onRetry ? (
        <EuiButton
          data-test-subj="infraDataSearchErrorCalloutRetryButton"
          color={calloutColor}
          size="s"
          onClick={onRetry}
        >
          <FormattedMessage
            id="xpack.logsShared.dataSearch.loadingErrorRetryButtonLabel"
            defaultMessage="Retry"
          />
        </EuiButton>
      ) : null}
    </EuiCallOut>
  );
};

const DataSearchErrorMessage = ({ error }: { error: SearchStrategyError }) => {
  if (error.type === 'aborted') {
    return <AbortedRequestErrorMessage error={error} />;
  } else if (error.type === 'shardFailure') {
    return <ShardFailureErrorMessage error={error} />;
  } else {
    return <GenericErrorMessage error={error} />;
  }
};

const AbortedRequestErrorMessage = ({}: { error?: AbortedRequestSearchStrategyError }) => (
  <FormattedMessage
    tagName="p"
    id="xpack.logsShared.dataSearch.abortedRequestErrorMessage"
    defaultMessage="The request was aborted."
  />
);

const GenericErrorMessage = ({ error }: { error: GenericSearchStrategyError }) => (
  <p>{error.message ?? `${error}`}</p>
);

const ShardFailureErrorMessage = ({ error }: { error: ShardFailureSearchStrategyError }) => (
  <FormattedMessage
    tagName="p"
    id="xpack.logsShared.dataSearch.shardFailureErrorMessage"
    defaultMessage="Index {indexName}: {errorMessage}"
    values={{
      indexName: error.shardInfo.index,
      errorMessage: error.message,
    }}
  />
);
