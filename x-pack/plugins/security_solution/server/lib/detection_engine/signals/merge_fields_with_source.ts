/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObjectLike } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';
import { SignalSource, SignalSourceHit } from './types';
import { SearchTypes } from '../../../../common/detection_engine/types';

/**
 * A bit stricter typing since the default fields type is an "any"
 */
export type FieldsType = string[] | number[] | boolean[] | object[] | null[];

/**
 * Merges a "doc._source" with its "doc.fields" on a "best effort" basis. If we run into problems
 * such as ambiguities, uncertainties, or data type contradictions then we will prefer the value within
 * "doc.fields" when we can. If "doc.fields" contradicts its self or is too ambiguous, then we assume that
 * there a problem within "doc.fields" due to a malformed runtime field definition and omit the last seen
 * contradiction. In some cases we might have to omit the merging of the field altogether and instead utilize
 * the value from "doc._source"
 *
 * Hence, this is labeled as "best effort" since we could run into conditions where we should have taken the value
 * from "doc.fields" but instead did not and took the value from "doc._source".
 *
 * If "doc.fields" does not exist we return "doc._source" untouched as-is. If "doc._source" does not exist but
 * "doc.fields" does exist then we will do a "best effort" to merge "doc.fields" into a fully functional object as
 * if it was a "doc._source". But again, if we run into contradictions or ambiguities from the
 * "doc.fields" we will remove that field or omit one of the contradictions.
 *
 * If a "doc.field" is found that does not exist in "doc._source" then we merge that "doc.field" into our
 * return object.
 *
 * If we find that a "field" contradicts the "doc._source" object in which we cannot create a regular
 * JSON such as a keyword trying to override an object or an object trying to override a keyword:
 *    "fields": { 'foo': 'value_1', foo.bar': 'value_2' } <-- Foo cannot be both an object and a value
 *
 * Then you will either get an object such as { "foo": "value_1" } or { "foo": { "bar": "value_2" } } but
 * we cannot merge both together as this is a contradiction and no longer capable of being a JSON object.
 *
 * Invalid field names such as ".", "..", ".foo", "foo.", ".foo." will be skipped as those cause errors if
 * we tried to insert them into Elasticsearch as a new field.
 *
 * If we encounter an array within "doc._source" that contains an object with more than 1 value and a "field"
 * tries to add a new element we will not merge that in as we do not know which array to merge that value into.
 *
 * If we encounter a flattened array in the fields object which is not a nested fields such as:
 *  "fields": { "object_name.first" : [ "foo", "bar" ], "object_name.second" : [ "mars", "bar" ] }
 *
 * And no "doc._source" with the name "object_name", the assumption is that we these are not related and we
 * construct the object as this:
 * { "object.name": { "first": ["foo", "bar" }, "second": ["mars", "bar"] }
 *
 * If we detect a "doc._source with a single flattened array sub objects we will prefer the "fields" flattened
 * array elements and copy them over as-is, which means we could be subtracting elements, adding elements, or
 * completely changing the items from the array.
 *
 * If we detect an object within the "doc._source" inside of the array, we will not take anything from the
 * "fields" flattened array elements even if they exist as it is ambiguous where we would put those elements
 * within the ""doc._source" as an override.
 *
 * It is best to feed this both the "doc._source" and "doc.fields" values to get the best chances of merging
 * the document correctly.
 *
 * Using this function gets you these value types merged that you would otherwise not get directly on your
 * "doc._source":
 *   - constant_keyword field
 *   - runtime fields
 *   - field aliases
 *
 * Refs:
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.13/keyword.html#constant-keyword-field-type
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.13/runtime.html
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.13/search-fields.html
 *
 * When writing this function, I would have preferred to add an enumeration array option to allow people to do
 * selective merging such as only merge "constant_keyword" or "field aliases" or "runtime fields" or or any combination
 * of these, but at the time of this code writing we cannot and it's a try them "all" or "none of them" best effort
 * with "fields" so far.
 *
 * @param doc The document with "_source" and "fields"
 * @param throwOnFailSafe Defaults to false, but if set to true it will cause a throw if the fail safe is triggered to indicate we need to add a new explicit test condition
 * @returns The two merged together in one object where we can
 */
export const mergeFieldsWithSource = ({ doc }: { doc: SignalSourceHit }): SignalSource => {
  const source = doc._source ?? {};
  const fields = doc.fields ?? {};
  const fieldEntries = Object.entries(fields);
  const filteredEntries = filterFieldEntries(fieldEntries);

  return filteredEntries.reduce(
    (merged, [fieldsKey, fieldsValue]: [string, FieldsType]) => {
      const valueInMergedDocument = get(fieldsKey, merged);

      // All early conditions we detect that we do not want to attempt a merge
      // such as ambiguities involving arrays or empty field values. We try to fail
      // fast first and not merge first.
      if (fieldsValue.length === 0) {
        return merged;
      } else if (valueInMergedDocument === undefined && arrayInPathExists(fieldsKey, merged)) {
        return merged;
      } else if (
        isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
        !isNestedObject(fieldsValue)
      ) {
        return merged;
      }

      // All conditions in which we merge and do boxing of single array types. If we miss
      // a condition we will not merge.
      if (valueInMergedDocument === undefined) {
        const valueToMerge = recursiveUnboxingNestedFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (isPrimitive(valueInMergedDocument)) {
        const valueToMerge = recursiveUnboxingNestedFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (isArrayOfPrimitives(valueInMergedDocument)) {
        const valueToMerge = recursiveUnboxingNestedFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (
        isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
        isNestedObject(fieldsValue) &&
        !Array.isArray(valueInMergedDocument)
      ) {
        const valueToMerge = recursiveUnboxingNestedFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else if (
        isObjectLikeOrArrayOfObjectLikes(valueInMergedDocument) &&
        isNestedObject(fieldsValue) &&
        Array.isArray(valueInMergedDocument)
      ) {
        const valueToMerge = recursiveUnboxingNestedFields(fieldsValue, valueInMergedDocument);
        return set(fieldsKey, valueToMerge, merged);
      } else {
        // fail safe catch all condition for production, but we shouldn't try to reach here and
        // instead write tests if we encounter this situation.
        return merged;
      }
    },
    { ...source }
  );
};

export const recursiveUnboxingNestedFields = (
  fieldsValue: FieldsType | FieldsType[0],
  valueInMergedDocument: SearchTypes
): FieldsType | FieldsType[0] => {
  if (Array.isArray(fieldsValue)) {
    const fieldsValueMapped = (fieldsValue as Array<string | number | boolean | object | null>).map(
      (value, index) => {
        if (Array.isArray(valueInMergedDocument)) {
          return recursiveUnboxingNestedFields(value, valueInMergedDocument[index]);
        } else {
          return recursiveUnboxingNestedFields(value, undefined);
        }
      }
    );
    if (fieldsValueMapped.length === 1) {
      if (Array.isArray(valueInMergedDocument)) {
        return fieldsValueMapped;
      } else {
        return fieldsValueMapped[0];
      }
    } else {
      return fieldsValueMapped;
    }
  } else if (typeof fieldsValue === 'object' && fieldsValue != null) {
    const reducedFromKeys = Object.keys(fieldsValue).reduce((accum, key) => {
      const recursed = recursiveUnboxingNestedFields(
        get(key, fieldsValue),
        get(key, valueInMergedDocument)
      );
      return set(key, recursed, accum);
    }, {});
    return reducedFromKeys;
  } else {
    return fieldsValue;
  }
};

/**
 * Returns true if an array within the path exists anywhere.
 * @param fieldsKey The fields key to check if an array exists along the path
 * @param source The source document to check for an array anywhere along the path
 * @returns true if we detect an array along the path, otherwise false
 */
export const arrayInPathExists = (fieldsKey: string, source: SignalSource): boolean => {
  const splitPath = fieldsKey.split('.');
  return splitPath.some((_, index, array) => {
    const newPath = [...array].splice(0, index + 1).join('.');
    return Array.isArray(get(newPath, source));
  });
};

/**
 * Matches any invalid keys from runtime fields such as runtime fields which can start with a
 * "." or runtime fields which can have ".." two or more dots.
 * @param fieldsKey The fields key to match against
 * @returns true if it is invalid key, otherwise false
 */
export const matchesInvalidKey = (fieldsKey: string): boolean => {
  return fieldsKey.startsWith('.') || fieldsKey.match(/[\.]{2,}/) != null;
};

/**
 * Returns true if we match against a subObject when passed in a fields entry and a fields key,
 * otherwise false.
 * @param fieldsKey The key to check against the entries to see if it is a subObject
 * @param fieldEntries The entries to check against.
 * @returns True if we are a subObject, otherwise false.
 */
export const matchesExistingSubObject = (
  fieldsKey: string,
  fieldEntries: Array<[string, FieldsType]>
): boolean => {
  const splitPath = fieldsKey.split('.');
  return splitPath.some((_, index, array) => {
    if (index + 1 === array.length) {
      return false;
    } else {
      const newPath = [...array].splice(0, index + 1).join('.');
      return fieldEntries.some(([fieldKeyToCheck]) => {
        return fieldKeyToCheck === newPath;
      });
    }
  });
};

/**
 * Filters field entries by removing invalid field entries such as any invalid characters
 * in the keys or if there are sub-objects that are trying to override regular objects and
 * are invalid runtime field names.
 * @param fieldEntries The field entries to filter
 * @returns The field entries filtered
 */
export const filterFieldEntries = (
  fieldEntries: Array<[string, FieldsType]>
): Array<[string, FieldsType]> => {
  return fieldEntries.filter(([fieldsKey]: [string, FieldsType]) => {
    return !matchesInvalidKey(fieldsKey) && !matchesExistingSubObject(fieldsKey, fieldEntries);
  });
};

/**
 * Returns true if the first value is object-like and makes an assumption everything is.
 * This should be used only for checking for nested object types within fields.
 * @param fieldsValue The value to check if the first element is object like or not
 * @returns True if this is a nested object, otherwise false.
 */
export const isNestedObject = (fieldsValue: FieldsType): boolean => {
  return isObjectLike(fieldsValue[0]);
};

/**
 * Returns true if this is an array and all elements of the array are primitives and not objects
 * @param valueInMergedDocument The search type to check if everything is primitive or not
 * @returns true if is an array and everything in the array is a primitive type
 */
export const isArrayOfPrimitives = (valueInMergedDocument: SearchTypes | null): boolean => {
  return (
    Array.isArray(valueInMergedDocument) &&
    valueInMergedDocument.every((value) => !isObjectLike(value))
  );
};

/**
 * Returns true if at least one element is an object, otherwise false if they all are not objects
 * if this is an array. If it is not an array, this will check that single type
 * @param valueInMergedDocument The search type to check if it is object like or not
 * @returns true if is object like and not an array, or true if it is an array and at least 1 element is object like
 */
export const isObjectLikeOrArrayOfObjectLikes = (
  valueInMergedDocument: SearchTypes | null
): boolean => {
  if (Array.isArray(valueInMergedDocument)) {
    return valueInMergedDocument.some((value) => isObjectLike(value));
  } else {
    return isObjectLike(valueInMergedDocument);
  }
};

/**
 * Returns true if it is a primitive type, otherwise false
 */
export const isPrimitive = (valueInMergedDocument: SearchTypes | null): boolean => {
  return !isObjectLike(valueInMergedDocument);
};
