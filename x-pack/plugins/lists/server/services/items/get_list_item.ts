/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type { Id, ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { createEsClientCallWithHeaders } from '@kbn/securitysolution-utils';
import type { SearchRequest } from '@elastic/elasticsearch/api/types';

import { transformElasticToListItem } from '../utils';
import { findSourceType } from '../utils/find_source_type';
import { SearchEsListItemSchema } from '../../schemas/elastic_response';

interface GetListItemOptions {
  id: Id;
  esClient: ElasticsearchClient;
  listItemIndex: string;
}

export const getListItem = async ({
  id,
  esClient,
  listItemIndex,
}: GetListItemOptions): Promise<ListItemSchema | null> => {
  const [request, options] = createEsClientCallWithHeaders<SearchRequest>({
    addOriginHeader: true,
    request: {
      body: {
        query: {
          term: {
            _id: id,
          },
        },
      },
      ignore_unavailable: true,
      index: listItemIndex,
      seq_no_primary_term: true,
    },
  });
  // Note: This typing of response = await esClient<SearchResponse<SearchEsListSchema>>
  // is because when you pass in seq_no_primary_term: true it does a "fall through" type and you have
  // to explicitly define the type <T>.
  const { body: listItemES } = await esClient.search<SearchEsListItemSchema>(request, options);

  if (listItemES.hits.hits.length) {
    // @ts-expect-error @elastic/elasticsearch _source is optional
    const type = findSourceType(listItemES.hits.hits[0]._source);
    if (type != null) {
      const listItems = transformElasticToListItem({ response: listItemES, type });
      return listItems[0];
    } else {
      return null;
    }
  } else {
    return null;
  }
};
