/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiComboBox } from '@elastic/eui';

const AGG_OPTIONS = [
  { label: 'Average', value: 'avg' },
  { label: 'Count', value: 'count' },
  { label: 'Max', value: 'max' },
  { label: 'Min', value: 'min' },
  { label: 'Sum', value: 'sum' },
];

export const METRIC_AGGREGATION_VALUES = AGG_OPTIONS.map(({ value }) => { return value; });

export function MetricSelect({ value, onChange }) {

  function onAggChange(selectedOptions) {
    if (selectedOptions.length === 0) {
      return;
    }

    const aggType = selectedOptions[0].value;
    onChange(aggType);
  }

  return (
    <EuiComboBox
      placeholder="Select aggregation"
      singleSelection={true}
      isClearable={false}
      options={AGG_OPTIONS}
      selectedOptions={AGG_OPTIONS.filter(option => {
        return value === option.value;
      })}
      onChange={onAggChange}
    />
  );
}

MetricSelect.propTypes = {
  value: PropTypes.oneOf(METRIC_AGGREGATION_VALUES),
  onChange: PropTypes.func.isRequired,
};
