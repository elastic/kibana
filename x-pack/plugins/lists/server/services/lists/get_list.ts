/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';

import { Id, ListSchema, SearchEsListSchema } from '../../../common/schemas';
import { transformElasticToList } from '../utils/transform_elastic_to_list';

interface GetListOptions {
  id: Id;
  callCluster: LegacyAPICaller;
  listIndex: string;
}

export const getList = async ({
  id,
  callCluster,
  listIndex,
}: GetListOptions): Promise<ListSchema | null> => {
  // Note: This typing of response = await callCluster<SearchResponse<SearchEsListSchema>>
  // is because when you pass in seq_no_primary_term: true it does a "fall through" type and you have
  // to explicitly define the type <T>.
  const response = await callCluster<SearchResponse<SearchEsListSchema>>('search', {
    body: {
      query: {
        term: {
          _id: id,
        },
      },
    },
    ignoreUnavailable: true,
    index: listIndex,
    seq_no_primary_term: true,
  });
  const list = transformElasticToList({ response });
  return list[0] ?? null;
};
