/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Converts the top-level fields of an object from an object to an array.
 * @param record the obect to map
 * @type T the type of the objects/arrays that will be mapped
 */
export const objectValuesToArrays = <T>(record: Record<string, T | T[]>): Record<string, T[]> => {
  const obj: Record<string, T[]> = {};
  Object.keys(record).forEach((key: string) => {
    const value = record[key];
    obj[key] = value ? (Array.isArray(value) ? value : [value]) : [];
  });
  return obj;
};
