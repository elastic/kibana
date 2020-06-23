/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filterItems = (fields, filter = '', items = []) => {
  const lowerFilter = filter.toLowerCase();
  return items.filter((item) => {
    const actualFields = fields || Object.keys(item);
    const indexOfMatch = actualFields.findIndex((field) => {
      const normalizedField = String(item[field]).toLowerCase();
      return normalizedField.includes(lowerFilter);
    });
    return indexOfMatch !== -1;
  });
};
