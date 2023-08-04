/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { SAVED_QUERY_BASE_URL } from '@kbn/data-plugin/common/constants';
import { rootRequest } from '../common';

export const createSavedQuery = (
  title: string,
  query: string,
  filterKey: string = 'agent.hostname'
) =>
  rootRequest<SavedQuery>({
    method: 'POST',
    url: `${SAVED_QUERY_BASE_URL}/_create`,
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
    headers: { 'kbn-xsrf': 'cypress-creds', [ELASTIC_HTTP_VERSION_HEADER]: '1' },
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
