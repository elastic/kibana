/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Query } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/*
 * Contains utility functions for building and processing queries.
 */

// Builds the base filter criteria used in queries,
// adding criteria for the time range and an optional query.
export function buildBaseFilterCriteria(
  timeFieldName?: string,
  earliestMs?: number,
  latestMs?: number,
  query?: Query['query']
): estypes.QueryDslQueryContainer[] {
  const filterCriteria = [];
  if (timeFieldName && earliestMs && latestMs) {
    filterCriteria.push({
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis',
        },
      },
    });
  }

  if (query && typeof query === 'object') {
    filterCriteria.push(query);
  }

  return filterCriteria;
}

export const addExcludeFrozenToQuery = (originalQuery: QueryDslQueryContainer | undefined) => {
  const FROZEN_TIER_TERM = {
    term: {
      _tier: {
        value: 'data_frozen',
      },
    },
  };

  if (!originalQuery) {
    return {
      bool: {
        must_not: [FROZEN_TIER_TERM],
      },
    };
  }

  const query = cloneDeep(originalQuery);

  delete query.match_all;

  if (isPopulatedObject(query.bool)) {
    // Must_not can be both arrays or singular object
    if (Array.isArray(query.bool.must_not)) {
      query.bool.must_not.push(FROZEN_TIER_TERM);
    } else {
      // If there's already a must_not condition
      if (isPopulatedObject(query.bool.must_not)) {
        query.bool.must_not = [query.bool.must_not, FROZEN_TIER_TERM];
      }
      if (query.bool.must_not === undefined) {
        query.bool.must_not = [FROZEN_TIER_TERM];
      }
    }
  } else {
    query.bool = {
      must_not: [FROZEN_TIER_TERM],
    };
  }

  return query;
};
