/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  EuiComboBoxOptionOption,
  EuiComboBox,
  EuiFormRow,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';
import { getSelectionToComboBoxOption, getSelectOptions } from './helpers';
import { BrowserFields, BrowserField } from '../../containers/source';
import { OptionalFieldLabel } from '../../../detections/components/rules/optional_field_label';

const MyLabelButton = styled(EuiButtonEmpty)`
  height: 18px;
  font-size: 12px;

  .euiIcon {
    width: 14px;
    height: 14px;
  }
`;

MyLabelButton.defaultProps = {
  flush: 'right',
};

interface OperatorProps {
  selectedField: string | undefined;
  browserFields: BrowserFields | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  dataTestSubj: string;
  rowLabel?: string;
  rowHelpText?: React.ReactNode;
  fieldInputWidth?: number;
  isRequired?: boolean;
  idAria?: string;
  showOptional?: boolean;
  placeholder?: string;
  filterCallback?: (field: Partial<BrowserField>) => boolean;
  onChange: (field: string | undefined) => void;
  onError?: (err: string | null) => void;
}

export const FieldComponent: React.FC<OperatorProps> = ({
  rowLabel,
  rowHelpText,
  placeholder,
  selectedField,
  browserFields,
  isLoading = false,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  showOptional = false,
  dataTestSubj,
  idAria,
  filterCallback,
  fieldInputWidth,
  onError,
  onChange,
}): JSX.Element => {
  const [filteredBrowserFields, setFilteredBrowserFields] = useState<BrowserFields | undefined>(
    browserFields
  );
  const [fieldError, setError] = useState<string | null>(null);
  const [touched, setIsTouched] = useState(false);
  const comboBoxOptions = useMemo((): EuiComboBoxOptionOption[] => {
    const { options, fields } = getSelectOptions(browserFields, filterCallback);
    setFilteredBrowserFields(fields);
    return options;
  }, [browserFields, filterCallback]);

  const selectedComboOptions = useMemo((): EuiComboBoxOptionOption[] => {
    if (
      selectedField == null ||
      (selectedField !== null && selectedField.trim() === '') ||
      filteredBrowserFields == null
    ) {
      setError(null);
      return [];
    }
    const { error, selection } = getSelectionToComboBoxOption(selectedField, filteredBrowserFields);
    setError(error);
    return selection;
  }, [selectedField, filteredBrowserFields]);

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const [{ label }] = newOptions;

      onChange(label);
    },
    [onChange]
  );

  const handleClearSelection = useCallback((): void => {
    onChange(undefined);
  }, [onChange]);

  const handleTouch = useCallback((): void => {
    setIsTouched(true);
  }, [setIsTouched]);

  const labelAppend = useMemo((): JSX.Element | null => {
    return (
      <EuiFlexGroup justifyContent="flexEnd">
        {fieldError != null && (
          <EuiFlexItem grow={false}>
            <MyLabelButton
              iconType="refresh"
              onClick={handleClearSelection}
              data-test-subj="fieldAutocompleteResetButton"
            >
              {i18n.RESET}
            </MyLabelButton>
          </EuiFlexItem>
        )}
        {showOptional && (
          <EuiFlexItem grow={false} data-test-subj="fieldAutocompleteOptionalLabel">
            {OptionalFieldLabel}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [showOptional, fieldError, handleClearSelection]);

  useEffect(() => {
    if (onError != null) {
      onError(fieldError);
    }
  }, [fieldError, onError]);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      helpText={rowHelpText}
      label={rowLabel}
      labelAppend={labelAppend}
      error={fieldError}
      isInvalid={fieldError != null}
      fullWidth
    >
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
    </EuiFormRow>
  );
};
