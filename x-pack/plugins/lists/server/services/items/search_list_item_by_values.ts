/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyAPICaller } from 'kibana/server';

import { SearchEsListItemSchema, SearchListItemArraySchema, Type } from '../../../common/schemas';
import { getQueryFilterFromTypeValue, transformElasticNamedSearchToListItem } from '../utils';

export interface SearchListItemByValuesOptions {
  listId: string;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  type: Type;
  value: unknown[];
}

export const searchListItemByValues = async ({
  listId,
  callCluster,
  listItemIndex,
  type,
  value,
}: SearchListItemByValuesOptions): Promise<SearchListItemArraySchema> => {
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
  return transformElasticNamedSearchToListItem({ response, type, value });
};
