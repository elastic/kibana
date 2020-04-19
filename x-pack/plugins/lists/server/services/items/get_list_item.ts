/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListsItemsSchema, SearchEsListsItemsSchema, Id } from '../../../common/schemas';
import { DataClient } from '../../types';
import { deriveTypeFromItem, transformElasticToListsItems } from '../utils';

interface GetListItemOptions {
  id: Id;
  dataClient: DataClient;
  listsItemsIndex: string;
}

export const getListItem = async ({
  id,
  dataClient,
  listsItemsIndex,
}: GetListItemOptions): Promise<ListsItemsSchema | null> => {
  const listItemES: SearchResponse<SearchEsListsItemsSchema> = await dataClient.callAsCurrentUser(
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

  if (listItemES.hits.hits.length) {
    const type = deriveTypeFromItem({ item: listItemES.hits.hits[0]._source });
    const listItems = transformElasticToListsItems({ response: listItemES, type });
    return listItems[0];
  } else {
    return null;
  }
};
