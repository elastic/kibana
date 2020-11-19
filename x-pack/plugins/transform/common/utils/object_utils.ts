/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This is similar to lodash's get() except that it's TypeScript aware and is able to infer return types.
// It splits the attribute key string and uses reduce with an idx check to access nested attributes.
export const getNestedProperty = (
  obj: Record<string, any>,
  accessor: string,
  defaultValue?: any
) => {
  const value = accessor.split('.').reduce((o, i) => o?.[i], obj);

  if (value === undefined) return defaultValue;

  return value;
};

export const setNestedProperty = (obj: Record<string, any>, accessor: string, value: any) => {
  let ref = obj;
  const accessors = accessor.split('.');
  const len = accessors.length;
  for (let i = 0; i < len - 1; i++) {
    const attribute = accessors[i];
    if (ref[attribute] === undefined) {
      ref[attribute] = {};
    }

    ref = ref[attribute];
  }

  ref[accessors[len - 1]] = value;

  return obj;
};
