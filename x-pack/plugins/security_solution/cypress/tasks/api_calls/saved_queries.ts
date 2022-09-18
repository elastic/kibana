/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createSavedQuery = (
  title: string,
  query: string,
  filterKey: string = 'agent.hostname'
) =>
  cy.request({
    method: 'POST',
    url: '/api/saved_query/_create',
    body: {
      title,
      description: '',
      query: { query, language: 'kuery' },
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: filterKey,
            params: { query: 'localhost' },
          },
          query: { match_phrase: { [filterKey]: 'localhost' } },
        },
      ],
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
