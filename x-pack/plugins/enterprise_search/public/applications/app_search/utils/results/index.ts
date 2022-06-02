/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const flattenField = (fieldName: string, fieldValue: object): Array<[string, object]> => {
  const flattened: Array<[string, object]> = [];

  if (typeof fieldValue === 'object' && !Object.keys(fieldValue).includes('raw')) {
    Object.entries(fieldValue).map(([propName, value]) => {
      flattenField(fieldName + '.' + propName, value).map(([flatKey, flatVal]) => {
        flattened.push([flatKey, flatVal]);
      });
    });
  } else {
    flattened.push([fieldName, fieldValue]);
  }

  return flattened;
};

export const flattenObject = (result: object): object => {
  const flattened: { [index: string]: object } = {};

  Object.entries(result).map(([key, value]) => {
    if (key === 'id' || key === '_meta') {
      flattened[key] = value;
    } else {
      flattenField(key, value).map(([flatName, flatValue]) => {
        flattened[flatName] = flatValue;
      });
    }
  });

  return flattened;
};
