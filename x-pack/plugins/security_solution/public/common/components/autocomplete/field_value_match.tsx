/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiFieldNumber, EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';
import { uniq } from 'lodash';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';
import { paramIsValid, getGenericComboBoxProps } from './helpers';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setIsTouched] = useState(false);
  const [isLoadingSuggestions, isSuggestingValues, suggestions] = useFieldValueAutocomplete({
    selectedField,
    operatorType: OperatorTypeEnum.MATCH,
    fieldValue: selectedValue,
    query: searchQuery,
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
        selectedField,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel, selectedField]
  );

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]): void => {
    const [newValue] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
    onChange(newValue ?? '');
  };

  const handleSearchChange = (searchVal: string): void => {
    setSearchQuery(searchVal);
  };

  const handleNonComboBoxInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.value;
    onChange(newValue);
  };

  const handleBooleanInputChange = (newOptions: EuiComboBoxOptionOption[]): void => {
    const [newValue] = newOptions;
    onChange(newValue != null ? newValue.label : '');
  };

  const isValid = useMemo(
    (): boolean => paramIsValid(selectedValue, selectedField, isRequired, touched),
    [selectedField, selectedValue, isRequired, touched]
  );

  const setIsTouchedValue = useCallback((): void => setIsTouched(true), [setIsTouched]);

  const inputPlaceholder = useMemo(
    (): string => (isLoading || isLoadingSuggestions ? i18n.LOADING : placeholder),
    [isLoading, isLoadingSuggestions, placeholder]
  );

  const isLoadingState = useMemo((): boolean => isLoading || isLoadingSuggestions, [
    isLoading,
    isLoadingSuggestions,
  ]);

  const getDefaultInput = (): JSX.Element => {
    return (
      <EuiComboBox
        placeholder={inputPlaceholder}
        isDisabled={isDisabled}
        isLoading={isLoadingState}
        isClearable={isClearable}
        options={comboOptions}
        selectedOptions={selectedComboOptions}
        onChange={handleValuesChange}
        singleSelection={{ asPlainText: true }}
        onSearchChange={handleSearchChange}
        onCreateOption={onChange}
        isInvalid={!isValid}
        onFocus={setIsTouchedValue}
        sortMatchesBy="startsWith"
        data-test-subj="valuesAutocompleteComboBox matchComboxBox"
        style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
        fullWidth
        async
      />
    );
  };

  if (!isSuggestingValues && selectedField != null) {
    switch (selectedField.type) {
      case 'number':
        return (
          <EuiFieldNumber
            placeholder={inputPlaceholder}
            onBlur={setIsTouchedValue}
            value={
              typeof selectedValue === 'string' && selectedValue.trim().length > 0
                ? parseFloat(selectedValue)
                : selectedValue ?? ''
            }
            onChange={handleNonComboBoxInputChange}
            data-test-subj="valueAutocompleteFieldMatchNumber"
            style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
            fullWidth
          />
        );
      case 'boolean':
        return (
          <EuiComboBox
            placeholder={inputPlaceholder}
            isDisabled={isDisabled}
            isLoading={isLoadingState}
            isClearable={isClearable}
            options={comboOptions}
            selectedOptions={selectedComboOptions}
            onChange={handleBooleanInputChange}
            singleSelection={{ asPlainText: true }}
            onFocus={setIsTouchedValue}
            data-test-subj="valuesAutocompleteComboBox matchComboxBoxBoolean"
            style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
            fullWidth
            async
          />
        );
      default:
        return getDefaultInput();
    }
  } else {
    return getDefaultInput();
  }
};

AutocompleteFieldMatchComponent.displayName = 'AutocompleteFieldMatch';
