/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListsItemsSchema } from '../../../common/schemas';
import { DataClient } from '../../types';

interface GetListItemOptions {
  id: string;
  dataClient: DataClient;
  listsItemsIndex: string;
}

export const getListItem = async ({
  id,
  dataClient,
  listsItemsIndex,
}: GetListItemOptions): Promise<ListsItemsSchema | null> => {
  const result: SearchResponse<Omit<ListsItemsSchema, 'id'>> = await dataClient.callAsCurrentUser(
    'search',
    {
      body: {
        query: {
          term: {
            _id: id,
          },
        },
      },
      index: listsItemsIndex,
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
