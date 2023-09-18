/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { isEmpty } from 'lodash';
import { getQueryFilter } from '../../../../utils/build_query';
import type { AgentsRequestOptions } from '../../../../../common/search_strategy';

export const buildAgentsQuery = ({
  kuery,
  pagination: { cursorStart, querySize },
  sort,
}: AgentsRequestOptions): ISearchRequestParams => {
  const activeQuery = `active: true`;
  let filter = activeQuery;
  if (!isEmpty(kuery)) {
    filter = activeQuery + ` AND ${kuery}`;
  }

  const filterQuery = getQueryFilter({ filter });

  const dslQuery = {
    allow_no_indices: true,
    index: AGENTS_INDEX,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: filterQuery,
        },
      },
      aggs: {
        platforms: {
          terms: {
            field: 'local_metadata.os.platform',
          },
          aggs: {
            policies: {
              terms: {
                field: 'policy_id',
              },
            },
          },
        },
        policies: {
          terms: {
            field: 'policy_id',
          },
        },
      },
      track_total_hits: true,
      sort: [
        {
          [sort.field]: {
            order: sort.direction,
          },
        },
      ],
      size: querySize,
      from: cursorStart,
    },
  };

  return dslQuery;
};
