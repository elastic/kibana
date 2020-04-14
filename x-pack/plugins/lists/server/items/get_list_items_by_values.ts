/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from 'kibana/server';

import { ListsItemsSchema, Type } from '../../common/schemas';
import { SearchResponse, ElasticListItemReturnType } from '../types';
import { transformElasticToListsItems, getQueryFilterFromTypeValue } from '../utils';

export const getListItemsByValues = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  type,
  value,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  type: Type;
  value: string[];
}): Promise<ListsItemsSchema[]> => {
  // TODO: Move the check for trim above this and remove it below. It shouldn't be here but rather a validation check above.
  if (listId.trim() === '') {
    return [];
  } else {
    const response: SearchResponse<ElasticListItemReturnType> = await clusterClient.callAsCurrentUser(
      'search',
      {
        index: listsItemsIndex,
        ignoreUnavailable: true,
        body: {
          query: {
            bool: {
              filter: getQueryFilterFromTypeValue({ listId, type, value }),
            },
          },
        },
        size: value.length,
      }
    );
    return transformElasticToListsItems({ response, type });
  }
};
