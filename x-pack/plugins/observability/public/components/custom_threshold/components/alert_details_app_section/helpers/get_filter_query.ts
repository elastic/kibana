/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getFilterQuery = (
  filter: string,
  groups?: Array<{
    field: string;
    value: string;
  }>
) => {
  let query = filter;
  if (groups) {
    const groupQueries = groups?.map(({ field, value }) => `${field}: ${value}`).join(' and ');
    query = query ? `(${query}) and ${groupQueries}` : groupQueries;
  }
  return query;
};
