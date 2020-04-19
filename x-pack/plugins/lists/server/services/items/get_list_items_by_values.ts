/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { Type, SearchEsListsItemsSchema, ListsItemsArraySchema } from '../../../common/schemas';
import { DataClient } from '../../types';
import { transformElasticToListsItems, getQueryFilterFromTypeValue } from '../utils';

interface GetListItemsByValuesOptions {
  listId: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  type: Type;
  value: string[];
}

export const getListItemsByValues = async ({
  listId,
  dataClient,
  listsItemsIndex,
  type,
  value,
}: GetListItemsByValuesOptions): Promise<ListsItemsArraySchema> => {
  const response: SearchResponse<SearchEsListsItemsSchema> = await dataClient.callAsCurrentUser(
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
      size: value.length, // This has a limit on the number which is 10k
    }
  );
  return transformElasticToListsItems({ response, type });
};
