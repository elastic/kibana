/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterFieldEntry } from '../utils/filter_field_entry';
import type { FieldsType, MergeStrategyFunction } from '../types';
import { recursiveUnboxingFields } from '../utils/recursive_unboxing_fields';
import { isTypeObject } from '../utils/is_type_object';
import { isNestedObject } from '../utils/is_nested_object';
import { robustGet, robustSet } from '../utils/robust_field_access';
import { robustIsPathValid } from '../utils/is_path_valid';

/**
 * Merges only missing sections of "doc._source" with its "doc.fields" on a "best effort" basis. See ../README.md for more information
 * on this function and the general strategies.
 * @param doc The document with "_source" and "fields"
 * @param ignoreFields Any fields that we should ignore and never merge from "fields". If the value exists
 * within doc._source it will be untouched and used. If the value does not exist within the doc._source,
 * it will not be added from fields.
 * @returns The two merged together in one object where we can
 */
export const mergeMissingFieldsWithSource: MergeStrategyFunction = ({
  doc,
  ignoreFields,
  ignoreFieldsRegexes,
}) => {
  const source = doc._source ?? {};
  const fields = doc.fields ?? {};
  const fieldKeys = Object.keys(fields);

  fieldKeys.forEach((fieldKey) => {
    const valueInMergedDocument = robustGet({ key: fieldKey, document: source });
    if (valueInMergedDocument == null && robustIsPathValid(fieldKey, source)) {
      const fieldsValue = fields[fieldKey];

      if (
        !hasEarlyReturnConditions(fieldsValue) &&
        filterFieldEntry([fieldKey, fieldsValue], fieldKeys, ignoreFields, ignoreFieldsRegexes)
      ) {
        const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
        return robustSet({ document: source, key: fieldKey, valueToSet: valueToMerge });
      }
    }
  });

  return {
    ...doc,
    _source: source,
  };
};

/**
 * Returns true if any early return conditions are met which are
 *   - If the fieldsValue is an empty array return
 *   - If the value to merge in is not undefined, return early
 *   - If an array within the path exists, do an early return
 *   - If the value matches a type object, do an early return
 * @param fieldsValue The field value to check
 * @param fieldsKey The key of the field we are checking
 * @param merged The merge document which is what we are testing conditions against
 * @returns true if we should return early, otherwise false
 */
const hasEarlyReturnConditions = (fieldsValue: FieldsType) => {
  return fieldsValue.length === 0 || isNestedObject(fieldsValue) || isTypeObject(fieldsValue);
};
