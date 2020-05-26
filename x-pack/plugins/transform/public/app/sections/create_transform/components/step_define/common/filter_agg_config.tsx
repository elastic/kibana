/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeEditor, EuiComboBox, EuiFormRow, EuiSelect } from '@elastic/eui';
import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { PivotAggsConfigWithUiBase } from '../../../../../common/pivot_aggs';

const filterAggOptions = ['term', 'range', 'bool'] as const;

export type FilterAggType = typeof filterAggOptions[number];

interface FilterAggProps {
  filterAgg: FilterAggType | undefined;
}

export type PivotAggsConfigFilter = PivotAggsConfigWithUiBase<FilterAggProps>;

/**
 * Gets configuration of the filter aggregation.
 */
export function getFilterAggConfig(): PivotAggsConfigFilter['formConfig'] {
  return {
    AggFormComponent: FilterAggForm,
    defaultAggConfig: {
      filterAgg: 'term',
    },
  };
}

/**
 * Component for filter aggregation related controls.
 */
export const FilterAggForm: PivotAggsConfigFilter['formConfig']['AggFormComponent'] = ({
  aggConfig,
  onChange,
}) => {
  const FilterAggTypeForm = getFilterAggTypeForm(aggConfig.filterAgg);

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.filerAggLabel"
            defaultMessage="Filter agg"
          />
        }
      >
        <EuiSelect
          options={filterAggOptions.map((v) => ({ text: v, value: v }))}
          value={aggConfig.filterAgg}
          onChange={(e) => {
            onChange({ filterAgg: e.target.value as FilterAggType });
          }}
        />
      </EuiFormRow>
      {aggConfig.filterAgg && <FilterAggTypeForm />}
    </>
  );
};

type FilterAggForm = FC<any>;

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeForm(filterAggType?: FilterAggType): FilterAggForm {
  switch (filterAggType) {
    case 'term':
      return FilterTermForm;
    default:
      return FilterEditorForm;
  }
}

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: FC<{ value: string }> = ({ value }) => {
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
        data-test-subj="filterTermValueSelection"
      />
    </EuiFormRow>
  );
};

export const FilterEditorForm: FC = () => {
  return <EuiCodeEditor value={''} mode="json" style={{ width: '100%' }} theme="textmate" />;
};
