/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import { IFieldType } from '../../../../../../../src/plugins/data/common';
import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';
import { OperatorOption, OperatorType } from './types';

export const getOperators = (field: IFieldType | null): OperatorOption[] => {
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

export const getAutocompleteOptions = (
  type: OperatorType,
  suggestions: string[],
  selectedValue: string[] | string | undefined
): string[] => {
  if (type === OperatorType.MATCH_ANY && Array.isArray(selectedValue)) {
    return selectedValue ? uniq([...selectedValue, ...suggestions]) : suggestions;
  } else if (type === OperatorType.MATCH && typeof selectedValue === 'string') {
    const valueAsStr = String(selectedValue);
    return selectedValue ? uniq([valueAsStr, ...suggestions]) : suggestions;
  } else {
    return [];
  }
};

export const getAutocompleteSelectValue = (
  type: OperatorType,
  selectedValue: string[] | string | undefined
): string[] => {
  if (type === OperatorType.MATCH_ANY && Array.isArray(selectedValue)) {
    return selectedValue;
  } else if (type === OperatorType.MATCH && typeof selectedValue === 'string') {
    const valueAsStr = String(selectedValue);
    return selectedValue ? [valueAsStr] : [];
  } else {
    return [];
  }
};
