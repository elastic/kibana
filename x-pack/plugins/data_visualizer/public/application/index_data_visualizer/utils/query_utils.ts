/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { cloneDeep } from 'lodash';
import { isPopulatedObject } from '../../../../common/utils/object_utils';

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
