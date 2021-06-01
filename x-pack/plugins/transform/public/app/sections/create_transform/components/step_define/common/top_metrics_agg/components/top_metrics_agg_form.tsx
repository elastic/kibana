/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiSelect, EuiRadioGroup } from '@elastic/eui';
import { PivotAggsConfigTopMetrics } from '../types';
import { PivotConfigurationContext } from '../../../../pivot_configuration/pivot_configuration';
import {
  isSpecialSortField,
  TOP_METRICS_SORT_FIELD_TYPES,
  TOP_METRICS_SPECIAL_SORT_FIELDS,
} from '../../../../../../../common/pivot_aggs';

export const TopMetricsAggForm: PivotAggsConfigTopMetrics['AggFormComponent'] = ({
  onChange,
  aggConfig,
}) => {
  const {
    state: { fields },
  } = useContext(PivotConfigurationContext)!;

  const sortFieldOptions = fields
    .filter((v) => TOP_METRICS_SORT_FIELD_TYPES.includes(v.type))
    .map(({ name }) => ({ text: name, value: name }));

  Object.values(TOP_METRICS_SPECIAL_SORT_FIELDS).forEach((v) => {
    sortFieldOptions.unshift({ text: v, value: v });
  });
  sortFieldOptions.unshift({ text: '', value: '' });

  const isSpecialFieldSelected = isSpecialSortField(aggConfig.sortField);

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.sortFieldTopMetricsLabel"
            defaultMessage="Sort field"
          />
        }
      >
        <EuiSelect
          options={sortFieldOptions}
          value={aggConfig.sortField}
          onChange={(e) => {
            onChange({ ...aggConfig, sortField: e.target.value });
          }}
          data-test-subj="transformSortFieldTopMetricsLabel"
        />
      </EuiFormRow>

      {isSpecialFieldSelected ? null : (
        <EuiRadioGroup
          options={[
            { id: 'asc', label: 'asc' },
            { id: 'desc', label: 'desc' },
          ]}
          idSelected={aggConfig.sortDirection}
          onChange={(id) => onChange({ ...aggConfig, sortDirection: id as 'asc' | 'desc' })}
          legend={{
            children: (
              <FormattedMessage
                id="xpack.transform.agg.popoverForm.sortDirectionTopMetricsLabel"
                defaultMessage="Sort direction"
              />
            ),
          }}
        />
      )}
    </>
  );
};
