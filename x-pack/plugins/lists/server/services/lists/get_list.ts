/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { APICaller } from 'kibana/server';

import { Id, ListSchema, SearchEsListSchema } from '../../../common/schemas';

interface GetListOptions {
  id: Id;
  callCluster: APICaller;
  listIndex: string;
}

export const getList = async ({
  id,
  callCluster,
  listIndex,
}: GetListOptions): Promise<ListSchema | null> => {
  const result: SearchResponse<SearchEsListSchema> = await callCluster('search', {
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
  if (result.hits.hits.length) {
    return {
      id: result.hits.hits[0]._id,
      ...result.hits.hits[0]._source,
    };
  } else {
    return null;
  }
};
