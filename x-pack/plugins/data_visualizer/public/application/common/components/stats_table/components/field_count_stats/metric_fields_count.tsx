/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

export interface MetricFieldsStats {
  visibleMetricsCount: number;
  totalMetricFieldsCount: number;
}
export interface MetricFieldsCountProps {
  metricsStats?: MetricFieldsStats;
}

export const MetricFieldsCount: FC<MetricFieldsCountProps> = ({ metricsStats }) => {
  if (
    !metricsStats ||
    metricsStats.visibleMetricsCount === undefined ||
    metricsStats.totalMetricFieldsCount === undefined
  )
    return null;
  return (
    <>
      {metricsStats && (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          className="dataVisualizerFieldCountContainer"
          data-test-subj="dataVisualizerMetricFieldsSummary"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.dataVisualizer.searchPanel.numberFieldsLabel"
                  defaultMessage="Number fields"
                />
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge
              color="subdued"
              size="m"
              data-test-subj="dataVisualizerVisibleMetricFieldsCount"
            >
              <strong>{metricsStats.visibleMetricsCount}</strong>
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s" data-test-subj="dataVisualizerMetricFieldsCount">
              <FormattedMessage
                id="xpack.dataVisualizer.searchPanel.ofFieldsTotal"
                defaultMessage="of {totalCount} total"
                values={{ totalCount: metricsStats.totalMetricFieldsCount }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
