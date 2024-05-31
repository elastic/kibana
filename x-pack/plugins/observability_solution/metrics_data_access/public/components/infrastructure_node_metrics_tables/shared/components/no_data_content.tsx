/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLOR_MODES_STANDARD,
  EuiButton,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiImage,
  EuiLoadingLogo,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import {
  noMetricIndicesPromptDescription,
  noMetricIndicesPromptPrimaryActionTitle,
  noMetricIndicesPromptTitle,
} from '../../../empty_states';
import noResultsIllustrationDark from './assets/no_results_dark.svg';
import noResultsIllustrationLight from './assets/no_results_light.svg';

export const MetricsTableLoadingContent = () => (
  <EuiEmptyPrompt
    data-test-subj="metricsTableLoadingContent"
    icon={<EuiLoadingLogo logo="logoMetrics" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.metricsData.metricsTable.loadingContentTitle"
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
        <EuiButton
          data-test-subj="infraMetricsTableNoIndicesContentButton"
          color="primary"
          fill
          {...integrationsLinkProps}
        >
          {noMetricIndicesPromptPrimaryActionTitle}
        </EuiButton>
      }
    />
  );
};

export const MetricsTableEmptyIndicesContent = () => {
  return (
    <EuiEmptyPrompt
      body={
        <EuiDescriptionList compressed>
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.metricsData.metricsTable.emptyIndicesPromptTimeRangeHintTitle"
              defaultMessage="Expand your time range"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <FormattedMessage
              id="xpack.metricsData.metricsTable.emptyIndicesPromptTimeRangeHintDescription"
              defaultMessage="Try searching over a longer period of time."
            />
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.metricsData.metricsTable.emptyIndicesPromptQueryHintTitle"
              defaultMessage="Adjust your query"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <FormattedMessage
              id="xpack.metricsData.metricsTable.emptyIndicesPromptQueryHintDescription"
              defaultMessage="Try searching for a different combination of terms."
            />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      }
      color="subdued"
      data-test-subj="metricsTableEmptyIndicesContent"
      icon={<NoResultsIllustration />}
      layout="horizontal"
      title={
        <h2>
          <FormattedMessage
            id="xpack.metricsData.metricsTable.emptyIndicesPromptTitle"
            defaultMessage="No results match your search criteria"
          />
        </h2>
      }
      titleSize="m"
    />
  );
};

const NoResultsIllustration = () => {
  const { colorMode } = useEuiTheme();

  const illustration =
    colorMode === COLOR_MODES_STANDARD.dark
      ? noResultsIllustrationDark
      : noResultsIllustrationLight;

  return (
    <EuiImage alt={noResultsIllustrationAlternativeText} size="fullWidth" src={illustration} />
  );
};

const noResultsIllustrationAlternativeText = i18n.translate(
  'xpack.metricsData.metricsTable.noResultsIllustrationAlternativeText',
  { defaultMessage: 'A magnifying glass with an exclamation mark' }
);
