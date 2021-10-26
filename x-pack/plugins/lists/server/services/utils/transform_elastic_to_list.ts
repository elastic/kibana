/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ListArraySchema } from '@kbn/securitysolution-io-ts-list-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { SearchEsListSchema } from '../../schemas/elastic_response';

export interface TransformElasticToListOptions {
  response: estypes.SearchResponse<SearchEsListSchema>;
}

export const transformElasticToList = ({
  response,
}: TransformElasticToListOptions): ListArraySchema => {
  // @ts-expect-error created_at is incompatible
  return response.hits.hits.map((hit) => {
    return {
      _version: encodeHitVersion(hit),
      id: hit._id,
      ...hit._source,
    };
  });
};
