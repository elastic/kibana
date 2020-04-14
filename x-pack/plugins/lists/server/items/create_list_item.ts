/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ScopedClusterClient } from 'kibana/server';

import { ListsItemsSchema } from '../../common/schemas/response/lists_items_schema';
import { Type } from '../../common/schemas/common/schemas';
import { ElasticListItemsInputType, CreateResponse } from '../types';
import { transformListItemsToElasticQuery } from '../utils/transform_list_items_to_elastic_query';

export const createListItem = async ({
  id,
  listId,
  type,
  value,
  clusterClient,
  listsItemsIndex,
}: {
  id: string | undefined;
  listId: string;
  type: Type;
  value: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema> => {
  const createdAt = new Date().toISOString();
  const tieBreakerId = uuid.v4();
  const body: ElasticListItemsInputType = {
    list_id: listId,
    created_at: createdAt,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    ...transformListItemsToElasticQuery({ type, value }),
  };

  const response: CreateResponse = await clusterClient.callAsCurrentUser('index', {
    index: listsItemsIndex,
    id,
    body,
  });

  return {
    id: response._id,
    type,
    value,
    ...body,
  };
};
