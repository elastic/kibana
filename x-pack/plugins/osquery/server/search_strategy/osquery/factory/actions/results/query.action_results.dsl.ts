/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { ACTION_RESPONSES_INDEX } from '../../../../../../common/constants';
import type { ActionResultsRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionResultsQuery = ({
  actionId,
  filterQuery,
  // pagination: { activePage, querySize },
  sort,
  componentTemplateExists,
}: ActionResultsRequestOptions): ISearchRequestParams => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      match_phrase: {
        action_id: actionId,
      },
    },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: componentTemplateExists
      ? `${ACTION_RESPONSES_INDEX}-default*`
      : `${AGENT_ACTIONS_RESULTS_INDEX}*`,
    ignore_unavailable: true,
    body: {
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
                        action_id: actionId,
                      },
                    },
                  ],
                },
              },
              aggs: {
                rows_count: {
                  sum: {
                    field: 'action_response.osquery.count',
                  },
                },
                responses: {
                  terms: {
                    script: {
                      lang: 'painless',
                      source:
                        "if (doc['error.keyword'].size()==0) { return 'success' } else { return 'error' }",
                    } as const,
                  },
                },
              },
            },
          },
        },
      },
      query: { bool: { filter } },
      // from: activePage * querySize,
      size: 10000, // querySize,
      track_total_hits: true,
      fields: ['*'],
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
