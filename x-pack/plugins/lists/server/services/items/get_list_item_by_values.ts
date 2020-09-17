/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { ListItemArraySchema, SearchEsListItemSchema, Type } from '../../../common/schemas';
import { getQueryFilterFromTypeValue, transformElasticToListItem } from '../utils';

export interface GetListItemByValuesOptions {
  listId: string;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  type: Type;
  value: string[];
}

export const getListItemByValues = async ({
  listId,
  callCluster,
  listItemIndex,
  type,
  value,
}: GetListItemByValuesOptions): Promise<ListItemArraySchema> => {
  const response = await callCluster<SearchEsListItemSchema>('search', {
    body: {
      query: {
        bool: {
          filter: getQueryFilterFromTypeValue({ listId, type, value }),
        },
      },
    },
    ignoreUnavailable: true,
    index: listItemIndex,
    size: 10000, // TODO: This has a limit on the number which is 10,000 the default of Elastic but we might want to provide a way to increase that number
  });
  return transformElasticToListItem({ response, type });
};
