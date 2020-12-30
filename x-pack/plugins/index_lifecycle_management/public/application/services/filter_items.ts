/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filterItems = <T>(field: keyof T, filter: string, items: T[] = []): T[] => {
  const lowerFilter = filter.toLowerCase();
  return items.filter((item: T) => {
    const normalizedValue = String(item[field]).toLowerCase();
    return normalizedValue.includes(lowerFilter);
  });
};
