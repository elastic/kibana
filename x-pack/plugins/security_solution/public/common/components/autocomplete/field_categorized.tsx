/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { getSelectionToComboBoxOption, getSelectOptions } from './helpers';
import { BrowserFields } from '../../containers/source';

interface FieldCategorizedProps {
  selectedField: string | undefined;
  browserFields: BrowserFields | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  fieldInputWidth?: number;
  isRequired?: boolean;
  placeholder?: string;
  onChange: (field: string | undefined) => void;
  onError?: (err: string | null) => void;
}

export const FieldCategorizedComponent: React.FC<FieldCategorizedProps> = ({
  placeholder,
  selectedField,
  browserFields,
  isLoading = false,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  fieldInputWidth,
  onError,
  onChange,
}): JSX.Element => {
  const [fieldError, setError] = useState<string | null>(null);
  const [touched, setIsTouched] = useState(false);
  const comboBoxOptions = useMemo(
    (): EuiComboBoxOptionOption[] => getSelectOptions(browserFields),
    [browserFields]
  );

  const selectedComboOptions = useMemo((): EuiComboBoxOptionOption[] => {
    if (
      selectedField == null ||
      (selectedField !== null && selectedField.trim() === '') ||
      browserFields == null
    ) {
      setError(null);
      return [];
    }
    const { error, selection } = getSelectionToComboBoxOption(selectedField, browserFields);
    setError(error);
    return selection;
  }, [selectedField, browserFields]);

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const [{ label }] = newOptions;

      onChange(label);
    },
    [onChange]
  );

  const handleTouch = useCallback((): void => {
    setIsTouched(true);
  }, [setIsTouched]);

  useEffect(() => {
    if (onError != null) {
      onError(fieldError);
    }
  }, [fieldError, onError]);

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={comboBoxOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isInvalid={isRequired ? touched && selectedField == null : false}
      onFocus={handleTouch}
      singleSelection={{ asPlainText: true }}
      data-test-subj="fieldAutocompleteComboBox"
      style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
      fullWidth
    />
  );
};
