/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
// import type { ActionResultsRequestOptions } from '../../../../../../common/search_strategy';
import { ENDPOINT_ACTION_RESPONSES_INDEX } from '../../../../../../common/endpoint/constants';

export const buildActionResultsQuery = ({
  actionId,
  sort,
  expiration,
}: any): ISearchRequestParams => {
  // }: ActionResultsRequestOptions): ISearchRequestParams => {
  const dslQuery = {
    allow_no_indices: true,
    index: [ENDPOINT_ACTION_RESPONSES_INDEX],
    body: {
      size: 1,
      query: {
        term: { action_id: '85207258-5641-4b33-8f8b-43cf13f6a8ca' },
        // term: { action_id: actionId },
      },
      aggs: {
        aggs: {
          global: {},
          aggs: {
            responses_by_action_id: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        action_id: '85207258-5641-4b33-8f8b-43cf13f6a8ca',
                        // action_id: actionId,
                      },
                    },
                  ],
                },
              },
              aggs: {
                responses: {
                  terms: {
                    script: {
                      lang: 'painless',
                      source:
                        "if (doc.containsKey('error.code') && doc['error.code'].size()==0) { return 'success' } else { return 'error' }",
                    } as const,
                  },
                },
              },
            },
          },
        },
      },
      sort: [
        {
          [sort.field]: {
            order: sort.direction,
          },
        },
      ],
    },
  };

  return dslQuery;
};
