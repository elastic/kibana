/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Result, ResultMeta } from '../../components/result/types';

export const flattenField = (fieldName: string, fieldValue: object): Array<[string, object]> => {
  const flattened: Array<[string, object]> = [];

  if (typeof fieldValue === 'object' && !Object.keys(fieldValue).includes('raw')) {
    Object.entries(fieldValue).map(([propName, value]) => {
      flattened.push([fieldName + '.' + propName, value]);
    });
  } else {
    flattened.push([fieldName, fieldValue]);
  }

  return flattened;
};

export const flattenSearchResult = (result: Result): Result => {
  const flattened: Result = {
    id: { raw: '' },
    _meta: {
      id: '',
      engine: '',
    },
  };

  Object.entries(result).map(([key, value]) => {
    if (key === 'id') {
      flattened[key] = value as { raw: string };
    } else if (key === '_meta') {
      flattened[key] = value as ResultMeta;
    } else {
      flattenField(key, value).map(([flatName, flatValue]) => {
        flattened[flatName] = flatValue;
      });
    }
  });

  return flattened;
};
