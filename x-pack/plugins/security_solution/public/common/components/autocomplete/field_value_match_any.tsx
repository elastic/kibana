/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';
import { uniq } from 'lodash';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { useGenericComboBox } from './hooks/use_generic_combo_box';
import { OperatorOption } from './types';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';

interface AutocompleteFieldMatchAnyProps {
  placeholder: string;
  field: IFieldType | null;
  operator: OperatorOption;
  selectedValue: string[];
  indexPattern: IIndexPattern;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  onChange: (arg: string[]) => void;
}

export const AutocompleteFieldMatchAnyComponent: React.FC<AutocompleteFieldMatchAnyProps> = ({
  placeholder,
  field,
  operator,
  selectedValue,
  indexPattern,
  isLoading,
  isDisabled = false,
  isClearable = false,
  onChange,
}): JSX.Element => {
  const [isLoadingSuggestions, suggestions, updateSuggestions] = useFieldValueAutocomplete({
    selectedField: field,
    operatorType: operator.type,
    fieldValue: selectedValue,
    indexPattern,
  });
  const getLabel = useCallback((option: string) => option, []);
  const optionsMemo = useMemo(
    () => (selectedValue ? uniq([...selectedValue, ...suggestions]) : suggestions),
    [suggestions, selectedValue]
  );
  const [{ comboOptions, labels, selectedComboOptions }] = useGenericComboBox<string>({
    options: optionsMemo,
    selectedOptions: selectedValue,
    getLabel,
  });

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
    onChange(newValues);
  };

  const onSearchChange = (searchVal: string) => {
    const signal = new AbortController().signal;

    updateSuggestions({
      fieldSelected: field,
      value: `${searchVal}`,
      patterns: indexPattern,
      signal,
    });
  };

  const onCreateOption = (option: string) => onChange([...(selectedValue || []), option]);

  return (
    <EuiComboBox
      placeholder={placeholder}
      isLoading={isLoading || isLoadingSuggestions}
      isClearable={isClearable}
      isDisabled={isDisabled}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      onSearchChange={onSearchChange}
      onCreateOption={onCreateOption}
      data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"
      fullWidth
    />
  );
};

AutocompleteFieldMatchAnyComponent.displayName = 'AutocompleteFieldMatchAny';
