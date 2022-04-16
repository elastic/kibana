/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { UserDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution/users/details';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { USER_FIELDS } from './helpers';

export const buildUserDetailsQuery = ({
  userName,
  defaultIndex,
  timerange: { from, to },
}: UserDetailsRequestOptions): ISearchRequestParams => {
  const filter = [
    { term: { 'user.name': userName } },
    {
      range: {
        '@timestamp': {
          format: 'strict_date_optional_time',
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggregations: {
        first_seen: {
          min: {
            field: '@timestamp',
          },
        },
        last_seen: {
          max: {
            field: '@timestamp',
          },
        },
        ...buildFieldsTermAggregation(USER_FIELDS),
      },
      query: { bool: { filter } },
      size: 0,
    },
  };

  return dslQuery;
};
