/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getQueryStringFilter = (query: string) => {
  let queryString = query;
  if (isAlphaNumeric(query) && !includesOperator(query.toLowerCase())) {
    // if user doesn't specify any query string syntax we user wildcard buy default
    queryString = `*${query}*`;
  }

  return {
    query_string: {
      query: escape(queryString),
      fields: ['monitor.id.text', 'monitor.name.text', 'url.full.text', 'monitor.type'],
    },
  };
};

const includesOperator = (query: string) => {
  return query.includes(' or ') || query.includes(' and ');
};

export const isAlphaNumeric = (str: string) => {
  const format = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
  return !format.test(str);
};
