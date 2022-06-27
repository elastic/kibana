/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery } from '@kbn/core/public';
import { Immutable } from '../../../common/endpoint/types';

export function cloneHttpFetchQuery(query: Immutable<HttpFetchQuery>): HttpFetchQuery {
  const clone: HttpFetchQuery = {};
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      clone[key] = [...value] as string[] | number[] | boolean[];
    } else {
      // Array.isArray is not removing ImmutableArray from the union.
      clone[key] = value as string | number | boolean;
    }
  }
  return clone;
}
