/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { getGenericComboBoxProps } from './helpers';
import { GetGenericComboBoxPropsReturn } from './types';

interface OperatorProps {
  placeholder: string;
  selectedField: IFieldType | undefined;
  indexPattern: IIndexPattern | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  fieldTypeFilter?: string[];
  fieldInputWidth?: number;
  isRequired?: boolean;
  onChange: (a: IFieldType[]) => void;
}

export const FieldComponent: React.FC<OperatorProps> = ({
  placeholder,
  selectedField,
  indexPattern,
  isLoading = false,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  fieldTypeFilter = [],
  fieldInputWidth,
  onChange,
}): JSX.Element => {
  const [touched, setIsTouched] = useState(false);
  const getLabel = useCallback(({ name }): string => name, []);
  const optionsMemo = useMemo((): IFieldType[] => {
    if (indexPattern != null) {
      if (fieldTypeFilter.length > 0) {
        return indexPattern.fields.filter(({ type }) => fieldTypeFilter.includes(type));
      } else {
        return indexPattern.fields;
      }
    } else {
      return [];
    }
  }, [fieldTypeFilter, indexPattern]);
  const selectedOptionsMemo = useMemo((): IFieldType[] => (selectedField ? [selectedField] : []), [
    selectedField,
  ]);
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<IFieldType>({
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
        getLabel,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]): void => {
    const newValues: IFieldType[] = newOptions.map(
      ({ label }) => optionsMemo[labels.indexOf(label)]
    );
    onChange(newValues);
  };

  const handleTouch = useCallback((): void => {
    setIsTouched(true);
  }, [setIsTouched]);

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={comboOptions}
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

FieldComponent.displayName = 'Field';
