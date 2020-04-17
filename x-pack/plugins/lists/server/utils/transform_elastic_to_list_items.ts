/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ElasticListItemReturnType } from '../types';
import { Type, ListsItemsSchema } from '../../common/schemas';

export const transformElasticToListsItems = ({
  response,
  type,
}: {
  response: SearchResponse<ElasticListItemReturnType>;
  type: Type;
}): ListsItemsSchema[] => {
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
      },
    } = hit;

    const baseTypes = {
      id: _id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      list_id,
      tie_breaker_id,
      type,
    };

    switch (type) {
      case 'ip': {
        return {
          ...baseTypes,
          value: ip ?? '', // TODO: Something better here than empty string
        };
      }
      case 'keyword': {
        return {
          ...baseTypes,
          value: keyword ?? '', // TODO: Something better here than empty string
        };
      }
    }
    // TypeScript is not happy unless I have this line here
    return assertUnreachable();
  });
};

export const assertUnreachable = (): never => {
  throw new Error('Unknown type in elastic_to_list_items');
};
