/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export function toArray<T>(maybeArray: T | T[] | undefined): T[] {
  if (!maybeArray) {
    return [];
  }
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }
  return [maybeArray];
}

export const isValidRange = (from: string, to: string): boolean => {
  if (moment(from).isAfter(to)) {
    return false;
  }
  return true;
};
