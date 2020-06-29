/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useCallback } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { useGenericComboBox } from './hooks/use_generic_combo_box';

interface OperatorProps {
  placeholder: string;
  selectedField: IFieldType | null;
  indexPattern: IIndexPattern | null;
  isLoading?: boolean;
  isDisabled?: boolean;
  isClearable?: boolean;
  fieldInputWidth?: number;
  onChange: (a: IFieldType[]) => void;
}

export const FieldComponent: React.FC<OperatorProps> = ({
  placeholder,
  selectedField,
  indexPattern,
  isLoading = false,
  isDisabled = false,
  isClearable = false,
  fieldInputWidth = 190,
  onChange,
}): JSX.Element => {
  const getLabel = useCallback((field) => field.name, []);
  const optionsMemo = useMemo(() => (indexPattern ? indexPattern.fields : []), [indexPattern]);
  const selectedOptionsMemo = useMemo(() => (selectedField ? [selectedField] : []), [
    selectedField,
  ]);
  const [{ comboOptions, labels, selectedComboOptions }] = useGenericComboBox<IFieldType>({
    options: optionsMemo,
    selectedOptions: selectedOptionsMemo,
    getLabel,
  });

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
    onChange(newValues);
  };

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={isClearable}
      singleSelection={{ asPlainText: true }}
      data-test-subj="fieldAutocompleteComboBox"
      style={{ width: `${fieldInputWidth}px` }}
    />
  );
};

FieldComponent.displayName = 'Field';
