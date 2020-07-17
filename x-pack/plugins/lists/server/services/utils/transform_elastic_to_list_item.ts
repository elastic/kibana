/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListItemArraySchema, SearchEsListItemSchema, Type } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

import { findSourceValue } from './find_source_value';

export interface TransformElasticToListItemOptions {
  response: SearchResponse<SearchEsListItemSchema>;
  type: Type;
}

export const transformElasticToListItem = ({
  response,
  type,
}: TransformElasticToListItemOptions): ListItemArraySchema => {
  return response.hits.hits.map((hit) => {
    const {
      _id,
      _source: {
        created_at,
        deserializer,
        serializer,
        updated_at,
        updated_by,
        created_by,
        list_id,
        tie_breaker_id,
        meta,
      },
    } = hit;
    const value = findSourceValue(hit._source);
    if (value == null) {
      throw new ErrorWithStatusCode(`Was expected ${type} to not be null/undefined`, 400);
    } else {
      return {
        created_at,
        created_by,
        deserializer,
        id: _id,
        list_id,
        meta,
        serializer,
        tie_breaker_id,
        type,
        updated_at,
        updated_by,
        value,
      };
    }
  });
};
