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

/**
 * Filters field entries by removing invalid field entries such as any invalid characters
 * in the keys or if there are sub-objects that are trying to override regular objects and
 * are invalid runtime field names. Also matches type objects such as geo-points and we ignore
 * those and don't try to merge those.
 *
 * @param fieldEntries The field entries to filter
 * @returns The field entries filtered
 */
export const filterFieldEntries = (
  fieldEntries: Array<[string, FieldsType]>
): Array<[string, FieldsType]> => {
  return fieldEntries.filter(([fieldsKey, fieldsValue]: [string, FieldsType]) => {
    return (
      !isInvalidKey(fieldsKey) &&
      !isMultiField(fieldsKey, fieldEntries) &&
      !isTypeObject(fieldsValue) // TODO: Look at not filtering this and instead transform it so it can be inserted correctly in the strategies which does an overwrite of everything from fields
    );
  });
};
