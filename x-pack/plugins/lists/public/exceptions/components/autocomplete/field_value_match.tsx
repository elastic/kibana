/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFormRow,
  EuiSuperSelect,
} from '@elastic/eui';
import { uniq } from 'lodash';
import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { AutocompleteStart } from '../../../../../../../src/plugins/data/public';

import { useFieldValueAutocomplete } from './hooks/use_field_value_autocomplete';
import { getGenericComboBoxProps, paramIsValid } from './helpers';
import { GetGenericComboBoxPropsReturn } from './types';
import * as i18n from './translations';

const BOOLEAN_OPTIONS = [
  { inputDisplay: 'true', value: 'true' },
  { inputDisplay: 'false', value: 'false' },
];

const SINGLE_SELECTION = { asPlainText: true };

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
  rowLabel?: string;
  autocompleteService: AutocompleteStart;
  onChange: (arg: string) => void;
  onError?: (arg: boolean) => void;
}

export const AutocompleteFieldMatchComponent: React.FC<AutocompleteFieldMatchProps> = ({
  placeholder,
  rowLabel,
  selectedField,
  selectedValue,
  indexPattern,
  isLoading,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  fieldInputWidth,
  onChange,
  onError,
  autocompleteService,
}): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoadingSuggestions, isSuggestingValues, suggestions] = useFieldValueAutocomplete({
    autocompleteService,
    fieldValue: selectedValue,
    indexPattern,
    operatorType: OperatorTypeEnum.MATCH,
    query: searchQuery,
    selectedField,
  });
  const getLabel = useCallback((option: string): string => option, []);
  const optionsMemo = useMemo((): string[] => {
    const valueAsStr = String(selectedValue);
    return selectedValue != null && selectedValue.trim() !== ''
      ? uniq([valueAsStr, ...suggestions])
      : suggestions;
  }, [suggestions, selectedValue]);
  const selectedOptionsMemo = useMemo((): string[] => {
    const valueAsStr = String(selectedValue);
    return selectedValue ? [valueAsStr] : [];
  }, [selectedValue]);

  const handleError = useCallback(
    (err: string | undefined): void => {
      setError((existingErr): string | undefined => {
        const oldErr = existingErr != null;
        const newErr = err != null;
        if (oldErr !== newErr && onError != null) {
          onError(newErr);
        }

        return err;
      });
    },
    [setError, onError]
  );

  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<string>({
        getLabel,
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const [newValue] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
      handleError(undefined);
      onChange(newValue ?? '');
    },
    [handleError, labels, onChange, optionsMemo]
  );

  const handleSearchChange = useCallback(
    (searchVal: string): void => {
      if (searchVal !== '' && selectedField != null) {
        const err = paramIsValid(searchVal, selectedField, isRequired, touched);
        handleError(err);

        setSearchQuery(searchVal);
      }
    },
    [handleError, isRequired, selectedField, touched]
  );

  const handleCreateOption = useCallback(
    (option: string): boolean | undefined => {
      const err = paramIsValid(option, selectedField, isRequired, touched);
      handleError(err);

      if (err != null) {
        // Explicitly reject the user's input
        return false;
      } else {
        onChange(option);
        return undefined;
      }
    },
    [isRequired, onChange, selectedField, touched, handleError]
  );

  const handleNonComboBoxInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const newValue = event.target.value;
      onChange(newValue);
    },
    [onChange]
  );

  const handleBooleanInputChange = useCallback(
    (newOption: string): void => {
      onChange(newOption);
    },
    [onChange]
  );

  const setIsTouchedValue = useCallback((): void => {
    setIsTouched(true);

    const err = paramIsValid(selectedValue, selectedField, isRequired, true);
    handleError(err);
  }, [setIsTouched, handleError, selectedValue, selectedField, isRequired]);

  const inputPlaceholder = useMemo((): string => {
    if (isLoading || isLoadingSuggestions) {
      return i18n.LOADING;
    } else if (selectedField == null) {
      return i18n.SELECT_FIELD_FIRST;
    } else {
      return placeholder;
    }
  }, [isLoading, selectedField, isLoadingSuggestions, placeholder]);

  const isLoadingState = useMemo((): boolean => isLoading || isLoadingSuggestions, [
    isLoading,
    isLoadingSuggestions,
  ]);

  const fieldInputWidths = useMemo(
    () => (fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}),
    [fieldInputWidth]
  );

  useEffect((): void => {
    setError(undefined);
    if (onError != null) {
      onError(false);
    }
  }, [selectedField, onError]);

  const defaultInput = useMemo((): JSX.Element => {
    return (
      <EuiFormRow
        label={rowLabel}
        error={error}
        isInvalid={selectedField != null && error != null}
        data-test-subj="valuesAutocompleteMatchLabel"
        fullWidth
      >
        <EuiComboBox
          placeholder={inputPlaceholder}
          isDisabled={isDisabled || !selectedField}
          isLoading={isLoadingState}
          isClearable={isClearable}
          options={comboOptions}
          selectedOptions={selectedComboOptions}
          onChange={handleValuesChange}
          singleSelection={SINGLE_SELECTION}
          onSearchChange={handleSearchChange}
          onCreateOption={handleCreateOption}
          isInvalid={selectedField != null && error != null}
          onBlur={setIsTouchedValue}
          sortMatchesBy="startsWith"
          data-test-subj="valuesAutocompleteMatch"
          style={fieldInputWidths}
          fullWidth
          async
        />
      </EuiFormRow>
    );
  }, [
    comboOptions,
    error,
    fieldInputWidths,
    handleCreateOption,
    handleSearchChange,
    handleValuesChange,
    inputPlaceholder,
    isClearable,
    isDisabled,
    isLoadingState,
    rowLabel,
    selectedComboOptions,
    selectedField,
    setIsTouchedValue,
  ]);

  if (!isSuggestingValues && selectedField != null) {
    switch (selectedField.type) {
      case 'number':
        return (
          <EuiFormRow
            label={rowLabel}
            error={error}
            isInvalid={selectedField != null && error != null}
            data-test-subj="valuesAutocompleteMatchLabel"
            fullWidth
          >
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
              style={fieldInputWidths}
              fullWidth
            />
          </EuiFormRow>
        );
      case 'boolean':
        return (
          <EuiFormRow
            label={rowLabel}
            error={error}
            isInvalid={selectedField != null && error != null}
            data-test-subj="valuesAutocompleteMatchLabel"
            fullWidth
          >
            <EuiSuperSelect
              isLoading={isLoadingState}
              options={BOOLEAN_OPTIONS}
              valueOfSelected={selectedValue ?? 'true'}
              onChange={handleBooleanInputChange}
              data-test-subj="valuesAutocompleteMatchBoolean"
              style={fieldInputWidths}
              fullWidth
            />
          </EuiFormRow>
        );
      default:
        return defaultInput;
    }
  } else {
    return defaultInput;
  }
};

AutocompleteFieldMatchComponent.displayName = 'AutocompleteFieldMatch';
