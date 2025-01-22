/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { excludeTiersQuery } from './exclude_tiers_query';

export function excludeFrozenQuery(): estypes.QueryDslQueryContainer[] {
  return excludeTiersQuery(['data_frozen']);
}
