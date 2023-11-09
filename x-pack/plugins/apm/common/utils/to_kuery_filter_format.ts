/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

type Separator = 'OR' | 'AND';

export function toKueryFilterFormat(
  key: string,
  values: string[],
  separator: Separator = 'OR'
) {
  return values.map((value) => `${key} : "${value}"`).join(` ${separator} `);
}
export function mergeKueries(
  kuery1: string,
  kuery2: string,
  separator: Separator = 'AND'
) {
  if (isEmpty(kuery1) && isEmpty(kuery2)) {
    return '';
  }

  const kueries = [];
  if (!isEmpty(kuery1)) {
    kueries.push(`(${kuery1})`);
  }

  if (!isEmpty(kuery2)) {
    kueries.push(kuery2);
  }

  return kueries.join(` ${separator} `);
}
