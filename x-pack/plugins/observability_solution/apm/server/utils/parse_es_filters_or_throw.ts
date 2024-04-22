/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BoolQuery } from '@kbn/es-query';
import { BadRequestError } from '../routes/typings';

export function parseEsFiltersOrThrow(filters?: string): BoolQuery {
  if (!filters) {
    return {
      should: [],
      must: [],
      must_not: [],
      filter: [],
    };
  }

  try {
    const parsedFilters = JSON.parse(filters);

    if (parsedFilters.must_not && !Array.isArray(parsedFilters.must_not)) {
      throw new Error('must_not is not iterable');
    }

    if (parsedFilters.filter && !Array.isArray(parsedFilters.filter)) {
      throw new Error('filter is not iterable');
    }

    return {
      should: [],
      must: [],
      must_not: parsedFilters.must_not ? [...parsedFilters.must_not] : [],
      filter: parsedFilters.filter ? [...parsedFilters.filter] : [],
    };
  } catch (e) {
    throw new BadRequestError(`Failed to parse filters: ${e.message}`);
  }
}
