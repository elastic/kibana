/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListSchema, Type } from '@kbn/securitysolution-io-ts-list-types';
import {
  EXCEPTION_OPERATORS,
  OperatorOption,
  doesNotExistOperator,
  existsOperator,
  isNotOperator,
  isOperator,
} from '@kbn/securitysolution-list-utils';

import { IFieldType } from '../../../../../../../src/plugins/data/common';

/**
 * Returns the appropriate operators given a field type
 *
 * @param field IFieldType selected field
 *
 */
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

/**
 * Given an array of lists and optionally a field this will return all
 * the lists that match against the field based on the types from the field
 * @param lists The lists to match against the field
 * @param field The field to check against the list to see if they are compatible
 */
export const filterFieldToList = (lists: ListSchema[], field?: IFieldType): ListSchema[] => {
  if (field != null) {
    const { esTypes = [] } = field;
    return lists.filter(({ type }) => esTypes.some((esType) => typeMatch(type, esType)));
  } else {
    return [];
  }
};

/**
 * Given an input list type and a string based ES type this will match
 * if they're exact or if they are compatible with a range
 * @param type The type to match against the esType
 * @param esType The ES type to match with
 */
export const typeMatch = (type: Type, esType: string): boolean => {
  return (
    type === esType ||
    (type === 'ip_range' && esType === 'ip') ||
    (type === 'date_range' && esType === 'date') ||
    (type === 'double_range' && esType === 'double') ||
    (type === 'float_range' && esType === 'float') ||
    (type === 'integer_range' && esType === 'integer') ||
    (type === 'long_range' && esType === 'long')
  );
};
