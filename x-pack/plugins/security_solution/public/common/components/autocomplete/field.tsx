/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { useGenericComboBox } from './use_generic_combo_box';

interface AutocompleteFieldState {
  type: 'phrase' | 'phrases' | 'exists';
  suggestions: string[];
  placeholder: string;
  isLoading: boolean;
  value: string | number | string[];
  getLabel: (option: any) => any;
  onChange: (a: unknown) => void;
}

export const AutocompleteField: React.FC<AutocompleteFieldState> = ({
  type,
  suggestions,
  placeholder,
  value,
  isLoading,
  onChange,
  getLabel,
}): JSX.Element => {
  console.log(JSON.stringify(value));
  const [{ options, labels, selectedOptions }] = useGenericComboBox({
    suggestions,
    value,
    type,
    getLabel,
  });

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => options[labels.indexOf(label)]);
    onChange(newValues);
  };

  const onSearchChange = (value: string | number | boolean) => {
    // onChange([{ label: `${value}` }]);
  };

  const onCreateOption = (val: string) => {
    onChange([...(value ?? []), val]);
  };

  if (type === 'exists') {
    return (
      <EuiComboBox
        placeholder=""
        options={[]}
        selectedOptions={[]}
        onChange={undefined}
        isDisabled
        data-test-subj="valuesAutocompleteComboBox existsComboxBox"
      />
    );
  } else if (type === 'phrase') {
    return (
      <EuiComboBox
        placeholder={placeholder}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleValuesChange}
        singleSelection={{ asPlainText: true }}
        onSearchChange={onSearchChange}
        onCreateOption={(option: string) => onChange([...(value || []), option])}
        isLoading={isLoading}
        isClearable={false}
        data-test-subj="valuesAutocompleteComboBox matchComboxBox"
      />
    );
  } else {
    return (
      <EuiComboBox
        placeholder={placeholder}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleValuesChange}
        onSearchChange={onSearchChange}
        onCreateOption={onCreateOption}
        isLoading={isLoading}
        isClearable={false}
        data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"
      />
    );
  }
};

AutocompleteField.displayName = 'AutocompleteField';
