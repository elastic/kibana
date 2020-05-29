/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FilterAggConfigRange } from '../types';

/**
 * Form component for the range filter aggregation.
 */
export const FilterRangeForm: FilterAggConfigRange['aggTypeConfig']['FilterAggFormComponent'] = () => {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.transform.agg.popoverForm.filerAgg.term.valueLabel"
          defaultMessage="Value"
        />
      }
    >
      <EuiComboBox
        fullWidth
        singleSelection={{ asPlainText: true }}
        options={[]}
        selectedOptions={[]}
        isClearable={false}
        data-test-subj="filterRangeValueSelection"
      />
    </EuiFormRow>
  );
};
