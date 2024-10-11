/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, keys, get, isString } from 'lodash';

export function validateEmptyStrings(value: unknown) {
  if (isString(value)) {
    if (value.trim() === '') {
      throw new Error(`value '' is not valid`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      validateEmptyStrings(item);
    });
  } else if (isObject(value)) {
    keys(value).forEach((key) => {
      validateEmptyStrings(get(value, key));
    });
  }
}
