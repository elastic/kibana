/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ISearchRequestParams } from '@kbn/data-plugin/common';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { ACTIONS_INDEX } from '../../../../../../common/constants';
import { AgentsRequestOptions } from '../../../../../../common/search_strategy';
// import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionsQuery = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filterQuery,
  sort,
  pagination: { cursorStart, querySize },
  componentTemplateExists,
}: AgentsRequestOptions): ISearchRequestParams => {
  // const filter = [...createQueryFilterClauses(filterQuery)];

  const dslQuery = {
    allow_no_indices: true,
    index: componentTemplateExists ? `${ACTIONS_INDEX}*` : AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    body: {
      // query: { bool: { filter } },
      query: {
        bool: {
          must: [
            {
              term: {
                type: {
                  value: 'INPUT_ACTION',
                },
              },
            },
            {
              term: {
                input_type: {
                  value: 'osquery',
                },
              },
            },
          ] as estypes.QueryDslQueryContainer[],
        },
      },
      from: cursorStart,
      size: querySize,
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
