/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SearchListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';

import { SearchEsListItemSchema } from '../../schemas/elastic_response';

import { transformElasticHitsToListItem } from './transform_elastic_to_list_item';

export interface TransformElasticMSearchToListItemOptions {
  response: estypes.SearchResponse<SearchEsListItemSchema>;
  type: Type;
  value: unknown[];
}

/**
 * Given an Elasticsearch response this will look to see if the named query matches the
 * index found. The named query will have to be in the format of, "1.0", "1.1", "2.0" where the
 * major number "1,2,n" will match with the index.
 * Ref: https://www.elastic.co/guide/en/elasticsearch//reference/7.9/query-dsl-bool-query.html#named-queries
 * @param response The elastic response
 * @param type The list type
 * @param value The values to check against the named queries.
 */
export const transformElasticNamedSearchToListItem = ({
  response,
  type,
  value,
}: TransformElasticMSearchToListItemOptions): SearchListItemArraySchema => {
  return value.map((singleValue, index) => {
    const matchingHits = response.hits.hits.filter((hit) => {
      if (hit.matched_queries != null) {
        return hit.matched_queries.some((matchedQuery) => {
          const [matchedQueryIndex] = matchedQuery.split('.');
          return matchedQueryIndex === `${index}`;
        });
      } else {
        return false;
      }
    });
    const items = transformElasticHitsToListItem({ hits: matchingHits, type });
    return {
      items,
      value: singleValue,
    };
  });
};
