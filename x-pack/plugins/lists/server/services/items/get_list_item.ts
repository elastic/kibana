/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';

import { Id, ListItemSchema, SearchEsListItemSchema } from '../../../common/schemas';
import { transformElasticToListItem } from '../utils';
import { findSourceType } from '../utils/find_source_type';

interface GetListItemOptions {
  id: Id;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
}

export const getListItem = async ({
  id,
  callCluster,
  listItemIndex,
}: GetListItemOptions): Promise<ListItemSchema | null> => {
  // Note: This typing of response = await callCluster<SearchResponse<SearchEsListSchema>>
  // is because when you pass in seq_no_primary_term: true it does a "fall through" type and you have
  // to explicitly define the type <T>.
  const listItemES = await callCluster<SearchResponse<SearchEsListItemSchema>>('search', {
    body: {
      query: {
        term: {
          _id: id,
        },
      },
    },
    ignoreUnavailable: true,
    index: listItemIndex,
    seq_no_primary_term: true,
  });

  if (listItemES.hits.hits.length) {
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
