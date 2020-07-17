/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { IFieldType } from '../../../../../../../src/plugins/data/common';
import { getOperators, getGenericComboBoxProps } from './helpers';
import { GetGenericComboBoxPropsReturn, OperatorOption } from './types';

interface OperatorState {
  placeholder: string;
  selectedField: IFieldType | undefined;
  operator: OperatorOption;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  operatorInputWidth?: number;
  operatorOptions?: OperatorOption[];
  onChange: (arg: OperatorOption[]) => void;
}

export const OperatorComponent: React.FC<OperatorState> = ({
  placeholder,
  selectedField,
  operator,
  isLoading = false,
  isDisabled = false,
  isClearable = false,
  operatorOptions,
  operatorInputWidth = 150,
  onChange,
}): JSX.Element => {
  const getLabel = useCallback(({ message }): string => message, []);
  const optionsMemo = useMemo(
    (): OperatorOption[] => (operatorOptions ? operatorOptions : getOperators(selectedField)),
    [operatorOptions, selectedField]
  );
  const selectedOptionsMemo = useMemo((): OperatorOption[] => (operator ? [operator] : []), [
    operator,
  ]);
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<OperatorOption>({
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
        getLabel,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = (newOptions: EuiComboBoxOptionOption[]): void => {
    const newValues: OperatorOption[] = newOptions.map(
      ({ label }) => optionsMemo[labels.indexOf(label)]
    );
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
      data-test-subj="operatorAutocompleteComboBox"
      style={{ width: `${operatorInputWidth}px` }}
    />
  );
};

OperatorComponent.displayName = 'Operator';
