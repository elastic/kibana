/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { ALL_VALUE } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Suggestion } from '../hooks/use_fetch_synthetics_suggestions';

interface Option {
  label: string;
  value: string;
}

export interface Props {
  allowAllOption?: boolean;
  dataTestSubj: string;
  fieldName: 'monitorIds' | 'projects' | 'tags' | 'locations' | 'monitorTypes';
  suggestions?: Suggestion[];
  isLoading?: boolean;
  required?: boolean;
  value?: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  setSearch: (val: string) => void;
  setSelectedField: (value: string) => void;
}

const ALL_OPTION = {
  label: i18n.translate('xpack.synthetics.filter.alert.allLabel', {
    defaultMessage: 'All',
  }),
  value: 'All',
};

export function FieldSelector({
  allowAllOption = true,
  dataTestSubj,
  value,
  onChange,
  isLoading,
  placeholder,
  suggestions,
  setSearch,
}: Props) {
  const options = (allowAllOption ? [ALL_OPTION] : []).concat(createOptions(suggestions));

  const debouncedSearch = debounce((val) => setSearch(val), 200);

  return (
    <EuiFormRow fullWidth>
      <EuiComboBox
        async
        placeholder={placeholder}
        data-test-subj={dataTestSubj}
        isClearable
        fullWidth
        isLoading={isLoading}
        onChange={(selected: Array<EuiComboBoxOptionOption<string>>) => {
          // removes ALL value option if a specific value is selected
          if (selected.length && selected.at(-1)?.value !== ALL_VALUE) {
            onChange(selected.filter((val) => val.value !== ALL_VALUE).map((val) => val.value!));
            return;
          }
          // removes specific value if ALL value is selected
          if (selected.length && selected.at(-1)?.value === ALL_VALUE) {
            onChange([]);
            return;
          }

          onChange([]);
        }}
        onSearchChange={(val: string) => debouncedSearch(val)}
        options={options}
        selectedOptions={value?.map((val) => {
          const option = options.find((opt) => opt.value === val);
          if (option) {
            return {
              value: val,
              label: option.label,
              'data-test-subj': `${dataTestSubj}SelectedValue`,
            };
          }
          return {
            value: val,
            label: val,
            'data-test-subj': `${dataTestSubj}SelectedValue`,
          };
        })}
      />
    </EuiFormRow>
  );
}

function createOptions(suggestions: Suggestion[] = []): Option[] {
  return suggestions
    .map((suggestion) => ({ label: suggestion.label, value: suggestion.value }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
