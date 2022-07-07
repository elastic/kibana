/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

import { get } from 'lodash/fp';
// import { set } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { SignalSource } from '../../types';
import { filterFieldEntries } from '../utils/filter_field_entries';
import type { FieldsType, MergeStrategyFunction } from '../types';
import { recursiveUnboxingFields } from '../utils/recursive_unboxing_fields';
import { isTypeObject } from '../utils/is_type_object';
import { arrayInPathExists } from '../utils/array_in_path_exists';
import { isNestedObject } from '../utils/is_nested_object';

/**
 * Merges only missing sections of "doc._source" with its "doc.fields" on a "best effort" basis. See ../README.md for more information
 * on this function and the general strategies.
 * @param doc The document with "_source" and "fields"
 * @param ignoreFields Any fields that we should ignore and never merge from "fields". If the value exists
 * within doc._source it will be untouched and used. If the value does not exist within the doc._source,
 * it will not be added from fields.
 * @returns The two merged together in one object where we can
 */
export const mergeMissingFieldsWithSource: MergeStrategyFunction = ({ doc, ignoreFields }) => {
  const source = doc._source ?? {};
  const fields = doc.fields ?? {};
  const fieldEntries = Object.entries(fields);
  const filteredEntries = filterFieldEntries(fieldEntries, ignoreFields);

  const startReduce = performance.now();
  const transformedSource = filteredEntries.reduce(
    (merged, [fieldsKey, fieldsValue]: [string, FieldsType]) => {
      const startLoop = performance.now();
      // console.error('iterating with fields key...', fieldsKey);
      if (
        hasEarlyReturnConditions({
          fieldsValue,
          fieldsKey,
          merged,
        })
      ) {
        return merged;
      }

      const gettingFieldFromMerged = performance.now();
      const valueInMergedDocument = get(fieldsKey, merged);
      const gotFieldFromMerged = performance.now();
      // console.error(
      //   'how long did it take to get field from merged?',
      //   Number(gotFieldFromMerged - gettingFieldFromMerged).toFixed(2)
      // );
      const unboxingFieldTimeStart = performance.now();
      const valueToMerge = recursiveUnboxingFields(fieldsValue, valueInMergedDocument);
      const unboxingFieldTimeEnd = performance.now();
      // console.error(
      //   'how long did it take to recursively unbox?',
      //   Number(unboxingFieldTimeEnd - unboxingFieldTimeStart).toFixed(2)
      // );
      const settingFieldStart = performance.now();
      // const setFieldInMerged = set(fieldsKey, valueToMerge, merged);
      const setFieldInMerged = set(merged, fieldsKey, valueToMerge);
      const settingFieldEnd = performance.now();
      // console.error('SET?', Number(settingFieldEnd - settingFieldStart).toFixed(2));

      // console.error('one loop', Number(settingFieldEnd - startLoop).toFixed(2));

      return setFieldInMerged;
    },
    { ...source }
  );
  const endReduce = performance.now();

  console.error('finished', Number(endReduce - startReduce).toFixed(2));

  return {
    ...doc,
    _source: transformedSource,
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
const hasEarlyReturnConditions = ({
  fieldsValue,
  fieldsKey,
  merged,
}: {
  fieldsValue: FieldsType;
  fieldsKey: string;
  merged: SignalSource;
}) => {
  const start = performance.now();

  const valueInMergedDocument = get(fieldsKey, merged);
  const toReturn =
    fieldsValue.length === 0 ||
    valueInMergedDocument !== undefined ||
    arrayInPathExists(fieldsKey, merged) ||
    isNestedObject(fieldsValue) ||
    isTypeObject(fieldsValue);
  const end = performance.now();

  const searchDuration = Number(end - start).toFixed(2);

  return toReturn;
};
