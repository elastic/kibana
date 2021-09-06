/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMultiField } from './is_multifield';
import { isInvalidKey } from './is_invalid_key';
import { isTypeObject } from './is_type_object';
import { FieldsType } from '../types';
import { isIgnored } from './is_ignored';
import { isEqlBug77152 } from './is_eql_bug_77152';

/**
 * Filters field entries by removing invalid field entries such as any invalid characters
 * in the keys or if there are sub-objects that are trying to override regular objects and
 * are invalid runtime field names. Also matches type objects such as geo-points and we ignore
 * those and don't try to merge those.
 *
 * @param fieldEntries The field entries to filter
 * @param ignoreFields Array of fields to ignore. If a value starts and ends with "/", such as: "/[_]+/" then the field will be treated as a regular expression.
 * If you have an object structure to ignore such as "{ a: { b: c: {} } } ", then you need to ignore it as the string "a.b.c"
 * @returns The field entries filtered
 */
export const filterFieldEntries = (
  fieldEntries: Array<[string, FieldsType]>,
  ignoreFields: string[]
): Array<[string, FieldsType]> => {
  return fieldEntries.filter(([fieldsKey, fieldsValue]: [string, FieldsType]) => {
    return (
      !isEqlBug77152(fieldsKey) &&
      !isIgnored(fieldsKey, ignoreFields) &&
      !isInvalidKey(fieldsKey) &&
      !isMultiField(fieldsKey, fieldEntries) &&
      !isTypeObject(fieldsValue) // TODO: Look at not filtering this and instead transform it so it can be inserted correctly in the strategies which does an overwrite of everything from fields
    );
  });
};
