/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import type {
  MetricFieldsCountProps,
  TotalFieldsCountProps,
} from '../stats_table/components/field_count_stats';
import { MetricFieldsCount, TotalFieldsCount } from '../stats_table/components/field_count_stats';

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
      data-test-subj="dataVisualizerFieldCountPanel"
      responsive={false}
      className="dvFieldCount__panel"
    >
      <TotalFieldsCount fieldsCountStats={fieldsCountStats} />
      <MetricFieldsCount metricsStats={metricsStats} />
      <EuiFlexItem className={'dvFieldCount__item'}>
        <EuiSwitch
          data-test-subj="dataVisualizerShowEmptyFieldsSwitch"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.searchPanel.showEmptyFields"
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
