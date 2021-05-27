/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { PivotAggsConfigTopMetrics } from '../types';

export const TopMetricsAggForm: PivotAggsConfigTopMetrics['AggFormComponent'] = ({
  onChange,
  selectedField,
  aggConfig,
}) => {
  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.sortTopMetricsLabel"
            defaultMessage="Sort"
          />
        }
      >
        <EuiSelect
          options={[{ text: '', value: '' }]}
          value={''}
          onChange={(e) => {}}
          data-test-subj="transformFilterAggTypeSelector"
        />
      </EuiFormRow>
    </>
  );
};
