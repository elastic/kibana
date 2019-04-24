/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Dictionary<TValue> {
  [id: string]: TValue;
}

// converts a dictionary to an array. note this looses the dictionary `key` information.
export function dictionaryToArray<TValue>(dict: Dictionary<TValue>): TValue[] {
  return Object.keys(dict).map(key => dict[key]);
}
