/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import type { ExperimentalFeatures } from '../../../../../../common/experimental_features';
import { NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy';
import type { ObservedUserDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution/users/observed_details';
import { buildFieldsTermAggregation } from '../../hosts/details/helpers';
import { USER_FIELDS } from './helpers';

export const buildObservedUserDetailsQuery = (
  { userName, defaultIndex, timerange: { from, to } }: ObservedUserDetailsRequestOptions,
  experimentalFeatures?: ExperimentalFeatures
): ISearchRequestParams => {
  const filter: QueryDslQueryContainer[] = [
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

  if (experimentalFeatures?.newUserDetailsFlyout) {
    filter.push(NOT_EVENT_KIND_ASSET_FILTER);
  }

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
