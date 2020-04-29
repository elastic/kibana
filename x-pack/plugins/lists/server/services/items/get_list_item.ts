/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { APICaller } from 'kibana/server';

import { Id, ListItemSchema, SearchEsListItemSchema } from '../../../common/schemas';
import { deriveTypeFromItem, transformElasticToListItem } from '../utils';

interface GetListItemOptions {
  id: Id;
  callCluster: APICaller;
  listItemIndex: string;
}

export const getListItem = async ({
  id,
  callCluster,
  listItemIndex,
}: GetListItemOptions): Promise<ListItemSchema | null> => {
  const listItemES: SearchResponse<SearchEsListItemSchema> = await callCluster('search', {
    body: {
      query: {
        term: {
          _id: id,
        },
      },
    },
    ignoreUnavailable: true,
    index: listItemIndex,
  });

  if (listItemES.hits.hits.length) {
    const type = deriveTypeFromItem({ item: listItemES.hits.hits[0]._source });
    const listItems = transformElasticToListItem({ response: listItemES, type });
    return listItems[0];
  } else {
    return null;
  }
};
