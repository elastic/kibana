/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from 'kibana/server';

import { ListsSchema } from '../../common/schemas';

import { getList } from '.';

export const deleteList = async ({
  id,
  clusterClient,
  listsIndex,
  listsItemsIndex,
}: {
  id: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsIndex: string;
  listsItemsIndex: string;
}): Promise<ListsSchema | null> => {
  // TODO: Move this check up higher in the API boundary and remove the trim here.
  if (id.trim() === '') {
    return null;
  } else {
    const list = await getList({ id, clusterClient, listsIndex });
    if (list == null) {
      return null;
    } else {
      await clusterClient.callAsCurrentUser('deleteByQuery', {
        index: listsItemsIndex,
        body: {
          query: {
            term: {
              list_id: id,
            },
          },
        },
      });

      await clusterClient.callAsCurrentUser('delete', {
        index: listsIndex,
        id,
      });
      return list;
    }
  }
};
