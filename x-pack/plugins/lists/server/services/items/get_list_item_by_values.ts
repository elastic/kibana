/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { ListItemArraySchema, SearchEsListItemSchema, Type } from '../../../common/schemas';
import { DataClient } from '../../types';
import { getQueryFilterFromTypeValue, transformElasticToListItem } from '../utils';

export interface GetListItemByValuesOptions {
  listId: string;
  dataClient: DataClient;
  listItemIndex: string;
  type: Type;
  value: string[];
}

export const getListItemByValues = async ({
  listId,
  dataClient,
  listItemIndex,
  type,
  value,
}: GetListItemByValuesOptions): Promise<ListItemArraySchema> => {
  const response: SearchResponse<SearchEsListItemSchema> = await dataClient.callAsCurrentUser(
    'search',
    {
      body: {
        query: {
          bool: {
            filter: getQueryFilterFromTypeValue({ listId, type, value }),
          },
        },
      },
      ignoreUnavailable: true,
      index: listItemIndex,
      size: value.length, // This has a limit on the number which is 10k
    }
  );
  return transformElasticToListItem({ response, type });
};
