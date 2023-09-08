/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';

export function toKueryFilterFormat(
  key: string,
  values: string[],
  separator: 'OR' | 'AND' = 'OR'
) {
  return values.reduce<string>((acc, value) => {
    if (isEmpty(acc)) {
      return `${key} : "${value}"`;
    }

    return `${acc} ${separator} ${key} : "${value}"`;
  }, '');
}
