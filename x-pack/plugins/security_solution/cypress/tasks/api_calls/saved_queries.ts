/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedQuery } from '@kbn/data-plugin/public';
import { rootRequest } from '../common';

export const createSavedQuery = (
  title: string,
  query: string,
  filterKey: string = 'agent.hostname'
) =>
  rootRequest<SavedQuery>({
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

export const deleteSavedQueries = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'query',
              },
            },
          ],
        },
      },
    },
  });
};
