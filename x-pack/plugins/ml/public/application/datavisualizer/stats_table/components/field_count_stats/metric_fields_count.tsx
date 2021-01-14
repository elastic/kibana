/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
          className="mlDataVisualizerFieldCountContainer"
          data-test-subj="mlDataVisualizerMetricFieldsSummary"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.ml.dataVisualizer.searchPanel.numberFieldsLabel"
                  defaultMessage="Number fields"
                />
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge
              color="subdued"
              size="m"
              data-test-subj="mlDataVisualizerVisibleMetricFieldsCount"
            >
              <strong>{metricsStats.visibleMetricsCount}</strong>
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s" data-test-subj="mlDataVisualizerMetricFieldsCount">
              <FormattedMessage
                id="xpack.ml.dataVisualizer.searchPanel.ofFieldsTotal"
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
