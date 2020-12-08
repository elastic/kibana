/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { isEmpty } from 'lodash/fp';

import { SearchEsListItemSchema, SearchListItemArraySchema, Type } from '../../../common/schemas';

import { transformElasticHitsToListItem } from './transform_elastic_to_list_item';

export interface TransformElasticMSearchToListItemOptions {
  response: SearchResponse<SearchEsListItemSchema>;
  type: Type;
  value: unknown[];
}

export const transformElasticNamedSearchToListItem = ({
  response,
  type,
  value,
}: TransformElasticMSearchToListItemOptions): SearchListItemArraySchema => {
  return value.reduce<SearchListItemArraySchema>((accum, singleValue, index) => {
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
    if (!isEmpty(matchingHits)) {
      const items = transformElasticHitsToListItem({ hits: matchingHits, type });
      const reduced = [
        ...accum,
        {
          items,
          value: singleValue,
        },
      ];
      return reduced;
    } else {
      return accum;
    }
  }, []);
};
