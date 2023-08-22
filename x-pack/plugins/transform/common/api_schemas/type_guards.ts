/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export const isEsSearchResponse = (arg: unknown): arg is estypes.SearchResponse => {
  return isPopulatedObject(arg, ['hits']);
};

type SearchResponseWithAggregations = Required<Pick<estypes.SearchResponse, 'aggregations'>> &
  estypes.SearchResponse;
export const isEsSearchResponseWithAggregations = (
  arg: unknown
): arg is SearchResponseWithAggregations => {
  return isEsSearchResponse(arg) && {}.hasOwnProperty.call(arg, 'aggregations');
};
