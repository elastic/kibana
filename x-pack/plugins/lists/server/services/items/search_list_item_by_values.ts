/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type { SearchListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';
import { createEsClientCallWithHeaders } from '@kbn/securitysolution-utils';

import {
  TransformElasticMSearchToListItemOptions,
  getQueryFilterFromTypeValue,
  transformElasticNamedSearchToListItem,
} from '../utils';
import { SearchEsListItemSchema } from '../../schemas/elastic_response';

export interface SearchListItemByValuesOptions {
  listId: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  type: Type;
  value: unknown[];
}

export const searchListItemByValues = async ({
  listId,
  esClient,
  listItemIndex,
  type,
  value,
}: SearchListItemByValuesOptions): Promise<SearchListItemArraySchema> => {
  const { body: response } = await esClient.search<SearchEsListItemSchema>(
    createEsClientCallWithHeaders({
      addOriginHeader: true,
      request: {
        ignore_unavailable: true,
        index: listItemIndex,
        query: {
          bool: {
            filter: getQueryFilterFromTypeValue({ listId, type, value }),
          },
        },
        size: 10000, // TODO: This has a limit on the number which is 10,000 the default of Elastic but we might want to provide a way to increase that number
      },
    })
  );
  return transformElasticNamedSearchToListItem({
    response,
    type,
    value,
  } as unknown as TransformElasticMSearchToListItemOptions);
};
