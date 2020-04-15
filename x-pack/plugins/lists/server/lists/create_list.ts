/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ScopedClusterClient } from 'kibana/server';
import { CreateDocumentResponse } from 'elasticsearch';

import { ElasticListInputType } from '../types';
import { ListsSchema, Type } from '../../common/schemas';

export const createList = async ({
  id,
  name,
  type,
  description,
  clusterClient,
  listsIndex,
}: {
  id: string | null | undefined;
  type: Type;
  name: string;
  description: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsIndex: string;
}): Promise<ListsSchema> => {
  const createdAt = new Date().toISOString();
  const body: ElasticListInputType = {
    name,
    description,
    type,
    tie_breaker_id: uuid.v4(),
    updated_at: createdAt,
    created_at: createdAt,
  };
  const response: CreateDocumentResponse = await clusterClient.callAsCurrentUser('index', {
    index: listsIndex,
    id,
    body,
  });
  return {
    id: response._id,
    ...body,
  };
};
