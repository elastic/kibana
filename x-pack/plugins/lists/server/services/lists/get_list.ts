/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { Id, ListsSchema, SearchEsListsSchema } from '../../../common/schemas';
import { DataClient } from '../../types';

interface GetListOptions {
  id: Id;
  dataClient: DataClient;
  listsIndex: string;
}

export const getList = async ({
  id,
  dataClient,
  listsIndex,
}: GetListOptions): Promise<ListsSchema | null> => {
  const result: SearchResponse<SearchEsListsSchema> = await dataClient.callAsCurrentUser('search', {
    body: {
      query: {
        term: {
          _id: id,
        },
      },
    },
    ignoreUnavailable: true,
    index: listsIndex,
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
