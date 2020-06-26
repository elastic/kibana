/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, zipObject } from 'lodash';

const isString = (val: any): boolean => typeof val === 'string';

export function pivotObjectArray<
  RowType extends { [key: string]: any },
  ReturnColumns extends string | number | symbol = keyof RowType
>(rows: RowType[], columns?: string[]): Record<string, ReturnColumns[]> {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }

  const columnValues = map(columnNames, (name) => map(rows, name));
  return zipObject(columnNames, columnValues);
}
