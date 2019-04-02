/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineNonEcsData } from '../../../../graphql/types';

export const deleteItemIdx = (data: TimelineNonEcsData[], idx: number) => [
  ...data.slice(0, idx),
  ...data.slice(idx + 1),
];

export const findItem = (data: TimelineNonEcsData[], field: string): number =>
  data.findIndex(d => d.field === field);

export const getValues = (field: string, data: TimelineNonEcsData[]): string[] | undefined => {
  const obj = data.find(d => d.field === field);
  if (obj != null) {
    return obj.value;
  }
  return undefined;
};
