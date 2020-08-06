/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { EuiComboBoxOptionOption } from '@elastic/eui';

import { IFieldType } from '../../../../../../../src/plugins/data/common';

import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';
import { GetGenericComboBoxPropsReturn, OperatorOption } from './types';

export const getOperators = (field: IFieldType | undefined): OperatorOption[] => {
  if (field == null) {
    return [isOperator];
  } else if (field.type === 'boolean') {
    return [isOperator, isNotOperator, existsOperator, doesNotExistOperator];
  } else if (field.type === 'nested') {
    return [isOperator];
  } else {
    return EXCEPTION_OPERATORS;
  }
};

export const paramIsValid = (
  params: string | undefined,
  field: IFieldType | undefined,
  isRequired: boolean,
  touched: boolean
): boolean => {
  if (isRequired && touched && (params == null || params === '')) {
    return false;
  }

  if ((isRequired && !touched) || (!isRequired && (params == null || params === ''))) {
    return true;
  }

  const types = field != null && field.esTypes != null ? field.esTypes : [];

  return types.reduce<boolean>((acc, type) => {
    switch (type) {
      case 'date':
        const moment = dateMath.parse(params ?? '');
        return Boolean(moment && moment.isValid());
      default:
        return acc;
    }
  }, true);
};

export function getGenericComboBoxProps<T>({
  options,
  selectedOptions,
  getLabel,
}: {
  options: T[];
  selectedOptions: T[];
  getLabel: (value: T) => string;
}): GetGenericComboBoxPropsReturn {
  const newLabels = options.map(getLabel);
  const newComboOptions: EuiComboBoxOptionOption[] = newLabels.map((label) => ({ label }));
  const newSelectedComboOptions = selectedOptions
    .map(getLabel)
    .filter((option) => {
      return newLabels.indexOf(option) !== -1;
    })
    .map((option) => {
      return newComboOptions[newLabels.indexOf(option)];
    });

  return {
    comboOptions: newComboOptions,
    labels: newLabels,
    selectedComboOptions: newSelectedComboOptions,
  };
}
