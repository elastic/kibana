/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, keys, get, set, isString } from 'lodash';

// Used to trim strings in an action object before validation
export function trimActionStrings(value: unknown) {
  if (isString(value)) {
    return value.trim();
  } else if (Array.isArray(value)) {
    return value.reduce((acc, item) => {
      acc.push(trimActionStrings(item));
      return acc;
    }, []);
  } else if (isObject(value)) {
    return keys(value).reduce((acc, key) => {
      set(acc, key, trimActionStrings(get(value, key)));
      return acc;
    }, {});
  } else {
    return value;
  }
}
