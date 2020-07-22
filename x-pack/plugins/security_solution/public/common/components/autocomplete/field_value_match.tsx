/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';
import { uniq } from 'lodash';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';
import { validateParams, getGenericComboBoxProps } from './helpers';
import { OperatorTypeEnum } from '../../../lists_plugin_deps';
import { GetGenericComboBoxPropsReturn } from './types';
import * as i18n from './translations';

interface AutocompleteFieldMatchProps {
  placeholder: string;
  selectedField: IFieldType | undefined;
  selectedValue: string | undefined;
  indexPattern: IIndexPattern | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  isRequired?: boolean;
  fieldInputWidth?: number;
  onChange: (arg: string) => void;
}

export const AutocompleteFieldMatchComponent: React.FC<AutocompleteFieldMatchProps> = ({
  placeholder,
  selectedField,
  selectedValue,
  indexPattern,
  isLoading,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  fieldInputWidth,
  onChange,
}): JSX.Element => {
  const [touched, setIsTouched] = useState(false);
  const [isLoadingSuggestions, suggestions, updateSuggestions] = useFieldValueAutocomplete({
    selectedField,
    operatorType: OperatorTypeEnum.MATCH,
    fieldValue: selectedValue,
    indexPattern,
  });
  const getLabel = useCallback((option: string): string => option, []);
  const optionsMemo = useMemo((): string[] => {
    const valueAsStr = String(selectedValue);
    return selectedValue ? uniq([valueAsStr, ...suggestions]) : suggestions;
  }, [suggestions, selectedValue]);
  const selectedOptionsMemo = useMemo((): string[] => {
    const valueAsStr = String(selectedValue);
    return selectedValue ? [valueAsStr] : [];
  }, [selectedValue]);

  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<string>({
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
        getLabel,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]): void => {
    const [newValue] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
    onChange(newValue ?? '');
  };

  const onSearchChange = (searchVal: string): void => {
    const signal = new AbortController().signal;

    updateSuggestions({
      fieldSelected: selectedField,
      value: `${searchVal}`,
      patterns: indexPattern,
      signal,
    });
  };

  const isValid = useMemo((): boolean => validateParams(selectedValue, selectedField), [
    selectedField,
    selectedValue,
  ]);

  return (
    <EuiComboBox
      placeholder={isLoading || isLoadingSuggestions ? i18n.LOADING : placeholder}
      isDisabled={isDisabled}
      isLoading={isLoading || isLoadingSuggestions}
      isClearable={isClearable}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      singleSelection={{ asPlainText: true }}
      onSearchChange={onSearchChange}
      onCreateOption={onChange}
      isInvalid={isRequired ? touched && !isValid : false}
      onFocus={() => setIsTouched(true)}
      sortMatchesBy="startsWith"
      data-test-subj="valuesAutocompleteComboBox matchComboxBox"
      style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
      fullWidth
      async
    />
  );
};

AutocompleteFieldMatchComponent.displayName = 'AutocompleteFieldMatch';
