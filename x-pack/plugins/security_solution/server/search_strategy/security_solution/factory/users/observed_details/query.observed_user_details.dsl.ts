/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import type { ObservedUserDetailsRequestOptions } from '../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { USER_FIELDS } from './helpers';

export const buildObservedUserDetailsQuery = ({
  userName,
  defaultIndex,
  timerange: { from, to },
  filterQuery,
}: ObservedUserDetailsRequestOptions): ISearchRequestParams => {
  const filter: QueryDslQueryContainer[] = [
    ...createQueryFilterClauses(filterQuery),
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
        ...buildFieldsTermAggregation(USER_FIELDS),
      },
      query: { bool: { filter } },
      size: 0,
    },
  };

  return dslQuery;
};
