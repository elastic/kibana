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

  const { availableFields, selectedFields } = useMemo(
    () => getComboBoxFields(indexPattern, selectedField, fieldTypeFilter),
    [indexPattern, selectedField, fieldTypeFilter]
  );

  const { comboOptions, labels, selectedComboOptions } = useMemo(
    () => getComboBoxProps({ availableFields, selectedFields }),
    [availableFields, selectedFields]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const newValues: IFieldType[] = newOptions.map(
        ({ label }) => availableFields[labels.indexOf(label)]
      );
      onChange(newValues);
    },
    [availableFields, labels, onChange]
  );

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

interface ComboBoxFields {
  availableFields: IFieldType[];
  selectedFields: IFieldType[];
}

const getComboBoxFields = (
  indexPattern: IIndexPattern | undefined,
  selectedField: IFieldType | undefined,
  fieldTypeFilter: string[]
): ComboBoxFields => {
  const existingFields = getExistingFields(indexPattern);
  const selectedFields = getSelectedFields(selectedField);
  const availableFields = getAvailableFields(existingFields, selectedFields, fieldTypeFilter);

  return { availableFields, selectedFields };
};

const getComboBoxProps = (fields: ComboBoxFields): GetGenericComboBoxPropsReturn => {
  const { availableFields, selectedFields } = fields;

  return getGenericComboBoxProps<IFieldType>({
    options: availableFields,
    selectedOptions: selectedFields,
    getLabel: (field) => field.name,
  });
};

const getExistingFields = (indexPattern: IIndexPattern | undefined): IFieldType[] => {
  return indexPattern != null ? indexPattern.fields : [];
};

const getSelectedFields = (selectedField: IFieldType | undefined): IFieldType[] => {
  return selectedField ? [selectedField] : [];
};

const getAvailableFields = (
  existingFields: IFieldType[],
  selectedFields: IFieldType[],
  fieldTypeFilter: string[]
): IFieldType[] => {
  const map = new Map<string, IFieldType>();

  existingFields.forEach((f) => map.set(f.name, f));
  selectedFields.forEach((f) => map.set(f.name, f));

  const array = Array.from(map.values());

  if (fieldTypeFilter.length > 0) {
    return array.filter(({ type }) => fieldTypeFilter.includes(type));
  }

  return array;
};
