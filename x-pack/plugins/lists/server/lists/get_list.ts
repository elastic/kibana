/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListsSchema } from '../../common/schemas';
import { DataClient } from '../types';

interface GetListOptions {
  id: string;
  clusterClient: DataClient;
  listsIndex: string;
}

export const getList = async ({
  id,
  clusterClient,
  listsIndex,
}: GetListOptions): Promise<ListsSchema | null> => {
  const result: SearchResponse<Omit<ListsSchema, 'id'>> = await clusterClient.callAsCurrentUser(
    'search',
    {
      body: {
        query: {
          term: {
            _id: id,
          },
        },
      },
      index: listsIndex,
      ignoreUnavailable: true,
    }
  );
  if (result.hits.hits.length) {
    return {
      id: result.hits.hits[0]._id,
      ...result.hits.hits[0]._source,
    };
  } else {
    return null;
  }
};
