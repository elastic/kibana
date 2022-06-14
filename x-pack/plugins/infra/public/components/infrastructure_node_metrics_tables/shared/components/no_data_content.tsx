/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { MetricsIndicesStatus } from '../types';

export const MetricsTableNoDataContent = ({
  indicesStatus,
  isLoading,
}: {
  indicesStatus: MetricsIndicesStatus;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <MetricsTableLoadingContent />;
  } else if (indicesStatus === 'missing') {
    return <MetricsTableNoIndicesContent />;
  } else if (indicesStatus === 'empty' || indicesStatus === 'available') {
    return <MetricsTableEmptyIndicesContent />;
  } else if (indicesStatus === 'unknown') {
    return <>unknown</>;
  }

  return null;
};

export const MetricsTableLoadingContent = () => (
  <EuiEmptyPrompt
    data-test-subj="metricsTableLoadingContent"
    title={
      <FormattedMessage
        id="xpack.infra.metricsTable.loadingContentTitle"
        defaultMessage="Loading metrics"
        tagName="h2"
      />
    }
  />
);

export const MetricsTableNoIndicesContent = () => (
  <EuiEmptyPrompt
    data-test-subj="metricsTableNoIndicesContent"
    title={
      <FormattedMessage
        id="xpack.infra.metricsTable.noIndicesContentTitle"
        defaultMessage="No metric indices found"
        tagName="h2"
      />
    }
  />
);

export const MetricsTableEmptyIndicesContent = () => (
  <EuiEmptyPrompt
    data-test-subj="metricsTableEmptyIndicesContent"
    title={
      <FormattedMessage
        id="xpack.infra.metricsTable.emptyIndicesContentTitle"
        defaultMessage="Metric indices are empty"
        tagName="h2"
      />
    }
  />
);
