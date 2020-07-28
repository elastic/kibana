/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListArraySchema, SearchEsListSchema } from '../../../common/schemas';

import { encodeHitVersion } from './encode_hit_version';

export interface TransformElasticToListOptions {
  response: SearchResponse<SearchEsListSchema>;
}

export const transformElasticToList = ({
  response,
}: TransformElasticToListOptions): ListArraySchema => {
  return response.hits.hits.map((hit) => {
    return {
      _version: encodeHitVersion(hit),
      id: hit._id,
      ...hit._source,
    };
  });
};
