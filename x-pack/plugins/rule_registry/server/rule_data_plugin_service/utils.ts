/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const incrementIndexName = (oldIndex: string) => {
  const baseIndexString = oldIndex.slice(0, -6);
  const newIndexNumber = Number(oldIndex.slice(-6)) + 1;
  if (isNaN(newIndexNumber)) {
    return undefined;
  }
  return baseIndexString + String(newIndexNumber).padStart(6, '0');
};

export const joinWith = <T>(separator: string) => (
  ...items: Array<T | null | undefined>
): string => {
  return items.filter(Boolean).map(String).join(separator);
};

export const joinWithDash = joinWith<string>('-');
