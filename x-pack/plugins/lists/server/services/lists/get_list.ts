/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

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
  const response = await callCluster<SearchEsListSchema>('search', {
    body: {
      query: {
        term: {
          _id: id,
        },
      },
    },
    ignoreUnavailable: true,
    index: listIndex,
  });
  const list = transformElasticToList({ response });
  return list[0] ?? null;
};
