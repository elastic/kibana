/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListItemArraySchema, SearchEsListItemSchema, Type } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

export interface TransformElasticToListItemOptions {
  response: SearchResponse<SearchEsListItemSchema>;
  type: Type;
}

export const transformElasticToListItem = ({
  response,
  type,
}: TransformElasticToListItemOptions): ListItemArraySchema => {
  return response.hits.hits.map(hit => {
    const {
      _id,
      _source: {
        created_at,
        updated_at,
        updated_by,
        created_by,
        list_id,
        tie_breaker_id,
        ip,
        keyword,
        meta,
      },
    } = hit;

    const baseTypes = {
      created_at,
      created_by,
      id: _id,
      list_id,
      meta,
      tie_breaker_id,
      type,
      updated_at,
      updated_by,
    };

    switch (type) {
      case 'ip': {
        if (ip == null) {
          throw new ErrorWithStatusCode('Was expecting ip to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: ip,
        };
      }
      case 'keyword': {
        if (keyword == null) {
          throw new ErrorWithStatusCode('Was expecting keyword to not be null/undefined', 400);
        }
        return {
          ...baseTypes,
          value: keyword,
        };
      }
    }
    return assertUnreachable();
  });
};

const assertUnreachable = (): never => {
  throw new Error('Unknown type in elastic_to_list_items');
};
