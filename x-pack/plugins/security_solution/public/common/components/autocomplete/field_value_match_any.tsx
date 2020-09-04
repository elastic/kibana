/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';
import uniq from 'lodash/uniq';
import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';
import { getGenericComboBoxProps, paramIsValid } from './helpers';
import { OperatorTypeEnum } from '../../../lists_plugin_deps';
import { GetGenericComboBoxPropsReturn } from './types';
import * as i18n from './translations';

interface AutocompleteFieldMatchAnyProps {
  placeholder: string;
  selectedField: IFieldType | undefined;
  selectedValue: string[];
  indexPattern: IIndexPattern | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  isRequired?: boolean;
  onChange: (arg: string[]) => void;
}

export const AutocompleteFieldMatchAnyComponent: React.FC<AutocompleteFieldMatchAnyProps> = ({
  placeholder,
  selectedField,
  selectedValue,
  indexPattern,
  isLoading,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  onChange,
}): JSX.Element => {
  const [touched, setIsTouched] = useState(false);
  const [isLoadingSuggestions, suggestions, updateSuggestions] = useFieldValueAutocomplete({
    selectedField,
    operatorType: OperatorTypeEnum.MATCH_ANY,
    fieldValue: selectedValue,
    indexPattern,
  });
  const getLabel = useCallback((option: string): string => option, []);
  const optionsMemo = useMemo(
    (): string[] => (selectedValue ? uniq([...selectedValue, ...suggestions]) : suggestions),
    [suggestions, selectedValue]
  );
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<string>({
        options: optionsMemo,
        selectedOptions: selectedValue,
        getLabel,
      }),
    [optionsMemo, selectedValue, getLabel]
  );

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]): void => {
    const newValues: string[] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
    onChange(newValues);
  };

  const onSearchChange = (searchVal: string) => {
    if (updateSuggestions != null) {
      updateSuggestions({
        fieldSelected: selectedField,
        value: searchVal,
        patterns: indexPattern,
      });
    }
  };

  const onCreateOption = (option: string) => onChange([...(selectedValue || []), option]);

  const isValid = useMemo((): boolean => {
    const areAnyInvalid =
      selectedComboOptions.filter(
        ({ label }) => !paramIsValid(label, selectedField, isRequired, touched)
      ).length > 0;
    return !areAnyInvalid;
  }, [selectedComboOptions, selectedField, isRequired, touched]);

  const setIsTouchedValue = useCallback((): void => setIsTouched(true), [setIsTouched]);

  const inputPlaceholder = useMemo(
    (): string => (isLoading || isLoadingSuggestions ? i18n.LOADING : placeholder),
    [isLoading, isLoadingSuggestions, placeholder]
  );

  const isLoadingState = useMemo((): boolean => isLoading || isLoadingSuggestions, [
    isLoading,
    isLoadingSuggestions,
  ]);

  return (
    <EuiComboBox
      placeholder={inputPlaceholder}
      isLoading={isLoadingState}
      isClearable={isClearable}
      isDisabled={isDisabled}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      onSearchChange={onSearchChange}
      onCreateOption={onCreateOption}
      isInvalid={!isValid}
      onFocus={setIsTouchedValue}
      delimiter=", "
      data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"
      fullWidth
      async
    />
  );
};

AutocompleteFieldMatchAnyComponent.displayName = 'AutocompleteFieldMatchAny';
