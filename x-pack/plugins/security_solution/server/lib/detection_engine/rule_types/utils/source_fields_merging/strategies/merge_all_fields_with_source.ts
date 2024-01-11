/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { set } from '@kbn/safer-lodash-set/fp';
import type { SignalSource } from '../../../types';
import { filterFieldEntries } from '../utils/filter_field_entries';
import type { FieldsType, MergeStrategyFunction } from '../types';
import { isObjectLikeOrArrayOfObjectLikes } from '../utils/is_objectlike_or_array_of_objectlikes';
import { isNestedObject } from '../utils/is_nested_object';
import { recursiveUnboxingFields } from '../utils/recursive_unboxing_fields';
import { isPrimitive } from '../utils/is_primitive';
import { isArrayOfPrimitives } from '../utils/is_array_of_primitives';
import { isTypeObject } from '../utils/is_type_object';
import { isPathValid } from '../utils/is_path_valid';
import { buildFieldsKeyAsArrayMap } from '../utils/build_fields_key_as_array_map';

/**
 * Merges all of "doc._source" with its "doc.fields" on a "best effort" basis. See ../README.md for more information
 * on this function and the general strategies.
 *
 * @param doc The document with "_source" and "fields"
 * @param ignoreFields Any fields that we should ignore and never merge from "fields". If the value exists
 * within doc._source it will be untouched and used. If the value does not exist within the doc._source,
 * it will not be added from fields.
 * @returns The two merged together in one object where we can
 */
export const mergeAllFieldsWithSource: MergeStrategyFunction = ({ doc, ignoreFields }) => {
  const source = doc._source ?? {};
  const fields = doc.fields ?? {};
  const fieldEntries = Object.entries(fields);
  const filteredEntries = filterFieldEntries(fieldEntries, ignoreFields);
  const fieldsKeyMap = buildFieldsKeyAsArrayMap(source);

  const transformedSource = filteredEntries.reduce(
    (merged, [fieldsKeyAsString, fieldsValue]: [string, FieldsType]) => {
      const fieldsKey = fieldsKeyMap[fieldsKeyAsString] ?? fieldsKeyAsString;

      if (
        hasEarlyReturnConditions({
          fieldsValue,
          fieldsKey,
          merged,
        })
      ) {
        return merged;
      }

      const valueInMergedDocument = get(fieldsKey, merged);
      if (valueInMergedDocument === undefined) {
        const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (isPrimitive(valueInMergedDocument)) {
        const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (isArrayOfPrimitives(valueInMergedDocument)) {
        const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (
        isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
        isNestedObject(fieldsValue) &&
        !Array.isArray(valueInMergedDocument)
      ) {
        const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (
        isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
        isNestedObject(fieldsValue) &&
        Array.isArray(valueInMergedDocument)
      ) {
        const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else {
        // fail safe catch all condition for production, but we shouldn't try to reach here and
        // instead write tests if we encounter this situation.
        return merged;
      }
    },
    { ...source }
  );

  return {
    ...doc,
    _source: transformedSource,
  };
};

/**
 * Returns true if any early return conditions are met which are
 *   - If the fieldsValue is an empty array return
 *   - If we have an array within the path return and the value in our merged documented is non-existent
 *   - If the value is an object or is an array of object types and we don't have a nested field
 * @param fieldsValue The field value to check
 * @param fieldsKey The key of the field we are checking
 * @param merged The merge document which is what we are testing conditions against
 * @returns true if we should return early, otherwise false
 */
const hasEarlyReturnConditions = ({
  fieldsValue,
  fieldsKey,
  merged,
}: {
  fieldsValue: FieldsType;
  fieldsKey: string[] | string;
  merged: SignalSource;
}) => {
  const valueInMergedDocument = get(fieldsKey, merged);
  return (
    fieldsValue.length === 0 ||
    (valueInMergedDocument === undefined && !isPathValid(fieldsKey, merged)) ||
    (isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
      !isNestedObject(fieldsValue) &&
      !isTypeObject(fieldsValue))
  );
};
