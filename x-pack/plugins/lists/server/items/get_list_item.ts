/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from 'kibana/server';

import { SearchResponse } from '../types';
import { ListsItemsSchema } from '../../common/schemas';

export const getListItem = async ({
  id,
  clusterClient,
  listsItemsIndex,
}: {
  id: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema | null> => {
  if (id.trim() === '') {
    return null;
  } else {
    const result: SearchResponse<Omit<
      ListsItemsSchema,
      'id'
    >> = await clusterClient.callAsCurrentUser('search', {
      body: {
        query: {
          term: {
            _id: id,
          },
        },
      },
      index: listsItemsIndex,
      ignoreUnavailable: true,
    });

    if (result.hits.hits.length) {
      return {
        id: result.hits.hits[0]._id,
        ...result.hits.hits[0]._source,
      };
    } else {
      return null;
    }
  }
};
