/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { useGenericComboBox } from './use_generic_combo_box';
import { getOperatorLabels } from '../exceptions/helpers';

interface OperatorState {
  type: 'phrase' | 'phrases' | 'exists';
  suggestions: string[];
  placeholder: string;
  isLoading: boolean;
  field: IField;
  operator: OperatorOption;
  getLabel: (option: any) => any;
  onChange: (a: unknown) => void;
}

export const Operator: React.FC<OperatorState> = ({
  placeholder,
  field,
  operator,
  isLoading,
  isClearable = false,
  onChange,
  getLabel,
}): JSX.Element => {
  const [{ options, labels, selectedOptions }] = useGenericComboBox({
    suggestions: getOperatorLabels(field),
    value: operator,
    type: null,
    getLabel,
  });

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => options[labels.indexOf(label)]);
    onChange(newValues);
  };

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleValuesChange}
      isLoading={isLoading}
      isClearable={isClearable}
      singleSelection={{ asPlainText: true }}
      data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"
    />
  );
};

Operator.displayName = 'Operator';
