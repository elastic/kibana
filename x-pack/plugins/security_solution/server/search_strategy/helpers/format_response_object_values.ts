/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues, isObject, isArray } from 'lodash/fp';

import { toArray } from './to_array';

export const mapObjectValuesToStringArray = (object: object): object =>
  mapValues((o) => {
    if (isObject(o) && !isArray(o)) {
      return mapObjectValuesToStringArray(o);
    }

    return toArray(o);
  }, object);

export const formatResponseObjectValues = <T>(object: T | T[] | null) => {
  if (object && typeof object === 'object') {
    return mapObjectValuesToStringArray(object as object);
  }

  return object;
};
