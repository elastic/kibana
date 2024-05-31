/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchQueryBody } from '../lib/langchain/elasticsearch_store/helpers/get_msearch_query_body';

/**
 * This mock Elasticsearch msearch request body contains two queries:
 * - The first query is a similarity (vector) search
 * - The second query is a required KB document (terms) search
 */
export const mSearchQueryBody: MsearchQueryBody = {
  body: [
    {
      index: '.kibana-elastic-ai-assistant-kb',
    },
    {
      query: {
        bool: {
          must_not: [
            {
              term: {
                'metadata.kbResource': 'esql',
              },
            },
            {
              term: {
                'metadata.required': true,
              },
            },
          ],
          must: [
            {
              text_expansion: {
                'vector.tokens': {
                  model_id: '.elser_model_2',
                  model_text:
                    'Generate an ESQL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called "follow_up" that contains a value of "true", otherwise, it should contain "false". The user names should also be enriched with their respective group names.',
                },
              },
            },
          ],
        },
      },
      size: 1,
    },
    {
      index: '.kibana-elastic-ai-assistant-kb',
    },
    {
      query: {
        bool: {
          must: [
            {
              term: {
                'metadata.kbResource': 'esql',
              },
            },
            {
              term: {
                'metadata.required': true,
              },
            },
          ],
        },
      },
      size: 1,
    },
  ],
};
