/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';
import { SignalSource } from '../../types';
import { filterFieldEntries } from '../utils/filter_field_entries';
import type { FieldsType, MergeStrategyFunction } from '../types';
import { isObjectLikeOrArrayOfObjectLikes } from '../utils/is_objectlike_or_array_of_objectlikes';
import { isNestedObject } from '../utils/is_nested_object';
import { recursiveUnboxingFields } from '../utils/recursive_unboxing_fields';
import { isPrimitive } from '../utils/is_primitive';
import { isArrayOfPrimitives } from '../utils/is_array_of_primitives';
import { arrayInPathExists } from '../utils/array_in_path_exists';
import { isTypeObject } from '../utils/is_type_object';

/**
 * Merges all of "doc._source" with its "doc.fields" on a "best effort" basis. See ../README.md for more information
 * on this function and the general strategies.
 *
 * @param doc The document with "_source" and "fields"
 * @param throwOnFailSafe Defaults to false, but if set to true it will cause a throw if the fail safe is triggered to indicate we need to add a new explicit test condition
 * @returns The two merged together in one object where we can
 */
export const mergeAllFieldsWithSource: MergeStrategyFunction = ({ doc }) => {
  const source = doc._source ?? {};
  const fields = doc.fields ?? {};
  const fieldEntries = Object.entries(fields);
  const filteredEntries = filterFieldEntries(fieldEntries);

  const transformedSource = filteredEntries.reduce(
    (merged, [fieldsKey, fieldsValue]: [string, FieldsType]) => {
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
  fieldsKey: string;
  merged: SignalSource;
}) => {
  const valueInMergedDocument = get(fieldsKey, merged);
  return (
    fieldsValue.length === 0 ||
    (valueInMergedDocument === undefined && arrayInPathExists(fieldsKey, merged)) ||
    (isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
      !isNestedObject(fieldsValue) &&
      !isTypeObject(fieldsValue))
  );
};
