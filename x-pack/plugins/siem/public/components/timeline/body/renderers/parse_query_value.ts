/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject, isNumber } from 'lodash/fp';

export const parseQueryValue = (
  value: string | number | object | undefined | null
): string | number => {
  if (value == null) {
    return '';
  } else if (isObject(value)) {
    return JSON.stringify(value);
  } else if (isNumber(value)) {
    return value;
  }
  return value.toString();
};
