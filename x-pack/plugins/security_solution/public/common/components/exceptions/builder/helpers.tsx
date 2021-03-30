/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { OperatorTypeEnum, ExceptionListType, OperatorEnum } from '../../../../lists_plugin_deps';
import { ExceptionsBuilderExceptionItem, EmptyEntry, EmptyNestedEntry } from '../types';
import exceptionableFields from '../exceptionable_fields.json';

export const filterIndexPatterns = (
  patterns: IIndexPattern,
  type: ExceptionListType
): IIndexPattern => {
  return type === 'endpoint'
    ? {
        ...patterns,
        fields: patterns.fields.filter(({ name }) => exceptionableFields.includes(name)),
      }
    : patterns;
};

export const getDefaultEmptyEntry = (): EmptyEntry => ({
  id: uuid.v4(),
  field: '',
  type: OperatorTypeEnum.MATCH,
  operator: OperatorEnum.INCLUDED,
  value: '',
});

export const getDefaultNestedEmptyEntry = (): EmptyNestedEntry => ({
  id: uuid.v4(),
  field: '',
  type: OperatorTypeEnum.NESTED,
  entries: [],
});

export const containsValueListEntry = (items: ExceptionsBuilderExceptionItem[]): boolean =>
  items.some((item) => item.entries.some((entry) => entry.type === OperatorTypeEnum.LIST));
