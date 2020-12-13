/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiSwitch, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

interface Props {
  metricsStats?: {
    visibleMetricFields: number;
    totalMetricFields: number;
  };
  fieldsCountStats?: {
    visibleFieldsCount: number;
    totalFieldsCount: number;
  };
  showEmptyFields: boolean;
  toggleShowEmptyFields: () => void;
}
export const FieldCountPanel: FC<Props> = ({
  metricsStats,
  fieldsCountStats,
  showEmptyFields,
  toggleShowEmptyFields,
}) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      style={{ marginLeft: 5 }}
      data-test-subj="mlDataVisualizerFieldCountPanel"
    >
      {metricsStats && (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          style={{ maxWidth: 200 }}
          data-test-subj="mlDataVisualizerMetricFieldsSummary"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.ml.dataVisualizer.searchPanel.metricsLabel"
                  defaultMessage="Metrics"
                />
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge
              color="subdued"
              size="m"
              data-test-subj="mlDataVisualizerVisibleMetricFieldsCountBadge"
            >
              <strong>{metricsStats.visibleMetricFields}</strong>
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <FormattedMessage
                id="xpack.ml.dataVisualizer.searchPanel.ofFieldsTotal"
                defaultMessage="of {totalCount} total"
                values={{ totalCount: metricsStats.totalMetricFields }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {fieldsCountStats && (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          style={{ maxWidth: 200 }}
          data-test-subj="mlDataVisualizerFieldsSummary"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.ml.dataVisualizer.searchPanel.fieldsLabel"
                  defaultMessage="Fields"
                />
              </h5>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiNotificationBadge
              color="subdued"
              size="m"
              data-test-subj="mlDataVisualizerVisibleFieldsCountBadge"
            >
              <strong>{fieldsCountStats.visibleFieldsCount}</strong>
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <FormattedMessage
                id="xpack.ml.dataVisualizer.searchPanel.ofFieldsTotal"
                defaultMessage="of {totalCount} total"
                values={{ totalCount: fieldsCountStats.totalFieldsCount }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <EuiFlexItem>
        <EuiSwitch
          data-test-subj="mlDataVisualizerShowEmptyFieldsSwitch"
          label={
            <FormattedMessage
              id="xpack.ml.dataVisualizer.searchPanel.showEmptyFields"
              defaultMessage="Show empty fields"
            />
          }
          checked={showEmptyFields}
          onChange={toggleShowEmptyFields}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
