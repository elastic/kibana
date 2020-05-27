/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeEditor, EuiComboBox, EuiFormRow, EuiSelect } from '@elastic/eui';
import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import { PivotAggsConfigWithUiBase } from '../../../../../common/pivot_aggs';
import { CreateTransformWizardContext } from '../../wizard/wizard';
import { useApi } from '../../../../../hooks';

const filterAggOptions = ['term', 'range', 'bool'] as const;

export type FilterAggType = typeof filterAggOptions[number];

interface FilterAggProps<U> {
  filterAgg: FilterAggType;
  aggTypeConfig: U | undefined;
}

export type PivotAggsConfigFilter<U = undefined> = PivotAggsConfigWithUiBase<FilterAggProps<U>>;

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
  selectedField,
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
            onChange({
              ...aggConfig,
              filterAgg: e.target.value as FilterAggType,
            });
          }}
        />
      </EuiFormRow>
      {aggConfig.filterAgg && (
        <FilterAggTypeForm
          config={aggConfig.aggTypeConfig}
          onChange={(e) => {
            onChange({
              ...aggConfig,
              aggTypeConfig: e,
            });
          }}
          selectedField={selectedField}
        />
      )}
    </>
  );
};

type FilterAggForm<T> = FC<{
  config: T | undefined;
  onChange: (arg: T) => void;
  selectedField?: string;
}>;

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeForm(filterAggType?: FilterAggType): FilterAggForm<any> {
  switch (filterAggType) {
    case 'term':
      return FilterTermForm;
    case 'range':
      return FilterRangeForm;
    default:
      return FilterEditorForm;
  }
}

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: FilterAggForm<{ value: string | undefined }> = ({
  config,
  onChange,
  selectedField,
}) => {
  const api = useApi();
  const { indexPattern } = useContext(CreateTransformWizardContext);

  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const onSearchChange = useCallback(
    (searchValue) => {
      setIsLoading(true);
      setOptions([]);

      const esSearchRequest = {
        index: indexPattern!.title,
        body: {
          query: {
            wildcard: {
              region: {
                value: `*${searchValue}*`,
              },
            },
          },
          aggs: {
            field_values: {
              terms: {
                field: selectedField,
                size: 10,
              },
            },
          },
          size: 0,
        },
      };

      api.esSearch(esSearchRequest).then((response) => {
        setOptions(
          response.aggregations.field_values.buckets.map(
            (value: { key: string; doc_count: number }) => ({ label: value.key })
          )
        );
        setIsLoading(false);
      });
    },
    [api, indexPattern, selectedField]
  );

  useEffect(() => {
    // Simulate initial load.
    onSearchChange('');
  }, [onSearchChange]);

  const selectedOptions = config?.value ? [{ label: config.value }] : undefined;

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
        async
        isLoading={isLoading}
        fullWidth
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        isClearable={false}
        onChange={(selected) => {
          onChange({ value: selected[0].label });
        }}
        onSearchChange={debounce(onSearchChange, 600)}
        data-test-subj="filterTermValueSelection"
      />
    </EuiFormRow>
  );
};

/**
 * Form component for the range filter aggregation.
 */
export const FilterRangeForm: FilterAggForm<{ from: string; to: string }> = ({
  config,
  onChange,
}) => {
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

export const FilterEditorForm: FC = () => {
  return <EuiCodeEditor value={''} mode="json" style={{ width: '100%' }} theme="textmate" />;
};
