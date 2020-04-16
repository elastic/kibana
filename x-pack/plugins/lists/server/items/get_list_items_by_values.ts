/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListsItemsSchema, Type } from '../../common/schemas';
import { ElasticListItemReturnType, DataClient } from '../types';
import { transformElasticToListsItems, getQueryFilterFromTypeValue } from '../utils';

interface GetListItemsByValuesOptions {
  listId: string;
  clusterClient: DataClient;
  listsItemsIndex: string;
  type: Type;
  value: string[];
}

export const getListItemsByValues = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  type,
  value,
}: GetListItemsByValuesOptions): Promise<ListsItemsSchema[]> => {
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
};
