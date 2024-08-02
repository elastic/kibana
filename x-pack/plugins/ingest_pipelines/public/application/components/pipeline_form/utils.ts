/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transform, isObject, isEqual } from 'lodash';

export function removeUndefinedValues(obj: object) {
  // If the input is an object, recursively clean each key-value pair.
  if (isObject(obj)) {
    // Use transform to iterate over the object and build a new result object.
    return transform(
      obj,
      (result: Record<string, any>, value: any, key: string) => {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== undefined) {
          // Only add the key-value pair if the value is not undefined.
          result[key as keyof typeof obj] = cleanedValue;
        }
      },
      {}
    );
  }
  return obj;
}

export function deepEqualIgnoreUndefined(obj1: object, obj2: object) {
  // Clean both objects by removing undefined values.
  const cleanedObj1 = removeUndefinedValues(obj1);
  const cleanedObj2 = removeUndefinedValues(obj2);

  return isEqual(cleanedObj1, cleanedObj2);
}
