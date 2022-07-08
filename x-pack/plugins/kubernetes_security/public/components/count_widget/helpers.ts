/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_QUERY } from '../../../common/constants';
import { QueryDslQueryContainerBool } from '../../types';

export const addResourceTypeToFilterQuery = (
  filterQuery: string | undefined,
  resourceType: 'node' | 'pod'
) => {
  let validFilterQuery = DEFAULT_QUERY;

  try {
    const parsedFilterQuery: QueryDslQueryContainerBool = JSON.parse(filterQuery || '{}');
    if (!(parsedFilterQuery?.bool?.filter && Array.isArray(parsedFilterQuery.bool.filter))) {
      throw new Error('Invalid filter query');
    }
    parsedFilterQuery.bool.filter.push({
      bool: {
        should: [
          {
            match_phrase: {
              'orchestrator.resource.type': resourceType,
            },
          },
        ],
      },
    });
    validFilterQuery = JSON.stringify(parsedFilterQuery);
  } catch {
    // no-op since validFilterQuery is initialized to be DEFAULT_QUERY
  }

  return validFilterQuery;
};
