/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, isNumber } from 'lodash/fp';

export const parseQueryValue = (
  value: string | number | object | undefined | null
): string | number => {
  if (value === '') {
    return '';
  } else if (isObject(value)) {
    return JSON.stringify(value);
  } else if (isNumber(value)) {
    return value;
  }
  return `${value}`;
};
