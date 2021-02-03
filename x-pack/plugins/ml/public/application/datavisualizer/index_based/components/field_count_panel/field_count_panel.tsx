/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import {
  MetricFieldsCount,
  TotalFieldsCount,
} from '../../../stats_table/components/field_count_stats';
import type {
  TotalFieldsCountProps,
  MetricFieldsCountProps,
} from '../../../stats_table/components/field_count_stats';

interface Props extends TotalFieldsCountProps, MetricFieldsCountProps {
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
      style={{ marginLeft: 4 }}
      data-test-subj="mlDataVisualizerFieldCountPanel"
    >
      <TotalFieldsCount fieldsCountStats={fieldsCountStats} />
      <MetricFieldsCount metricsStats={metricsStats} />
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
