/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLinkProps } from '@kbn/observability-plugin/public';
import React from 'react';
import {
  noMetricIndicesPromptDescription,
  noMetricIndicesPromptPrimaryActionTitle,
  noMetricIndicesPromptTitle,
} from '../../../empty_states';

export const MetricsTableLoadingContent = () => (
  <EuiEmptyPrompt
    data-test-subj="metricsTableLoadingContent"
    icon={<EuiLoadingLogo logo="logoMetrics" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.metricsTable.loadingContentTitle"
          defaultMessage="Loading metrics"
        />
      </h2>
    }
  />
);

export const MetricsTableNoIndicesContent = () => {
  const integrationsLinkProps = useLinkProps({ app: 'integrations', pathname: 'browse' });

  return (
    <EuiEmptyPrompt
      data-test-subj="metricsTableLoadingContent"
      iconType="logoMetrics"
      title={<h2>{noMetricIndicesPromptTitle}</h2>}
      body={<p>{noMetricIndicesPromptDescription}</p>}
      actions={
        <EuiButton color="primary" fill {...integrationsLinkProps}>
          {noMetricIndicesPromptPrimaryActionTitle}
        </EuiButton>
      }
    />
  );
};

export const MetricsTableEmptyIndicesContent = () => (
  <EuiEmptyPrompt
    data-test-subj="metricsTableEmptyIndicesContent"
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.metricsTable.emptyIndicesContentTitle"
          defaultMessage="Metric indices are empty"
        />
      </h2>
    }
  />
);
