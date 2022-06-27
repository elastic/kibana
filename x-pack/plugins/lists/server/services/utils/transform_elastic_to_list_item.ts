/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { ErrorWithStatusCode } from '../../error_with_status_code';
import { SearchEsListItemSchema } from '../../schemas/elastic_response';

import { findSourceValue } from './find_source_value';

export interface TransformElasticToListItemOptions {
  response: estypes.SearchResponse<SearchEsListItemSchema>;
  type: Type;
}

export interface TransformElasticHitToListItemOptions {
  hits: Array<estypes.SearchHit<SearchEsListItemSchema>>;
  type: Type;
}

export const transformElasticToListItem = ({
  response,
  type,
}: TransformElasticToListItemOptions): ListItemArraySchema => {
  return transformElasticHitsToListItem({ hits: response.hits.hits, type });
};

export const transformElasticHitsToListItem = ({
  hits,
  type,
}: TransformElasticHitToListItemOptions): ListItemArraySchema => {
  return hits.map((hit) => {
    const { _id, _source } = hit;
    const {
      /* eslint-disable @typescript-eslint/naming-convention */
      created_at,
      deserializer,
      serializer,
      updated_at,
      updated_by,
      created_by,
      list_id,
      tie_breaker_id,
      meta,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = _source!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    // @ts-expect-error _source is optional
    const value = findSourceValue(hit._source);
    if (value == null) {
      throw new ErrorWithStatusCode(`Was expected ${type} to not be null/undefined`, 400);
    } else {
      return {
        _version: encodeHitVersion(hit),
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
