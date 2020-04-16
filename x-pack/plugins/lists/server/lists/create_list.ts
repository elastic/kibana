/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';

import { ElasticListInputType, DataClient } from '../types';
import { ListsSchema, Type } from '../../common/schemas';

interface CreateListOptions {
  id: string | null | undefined;
  type: Type;
  name: string;
  description: string;
  dataClient: DataClient;
  listsIndex: string;
  user: string;
}

export const createList = async ({
  id,
  name,
  type,
  description,
  dataClient,
  listsIndex,
  user,
}: CreateListOptions): Promise<ListsSchema> => {
  const createdAt = new Date().toISOString();
  const body: ElasticListInputType = {
    name,
    description,
    type,
    tie_breaker_id: uuid.v4(),
    updated_at: createdAt,
    created_at: createdAt,
    created_by: user,
    updated_by: user,
  };
  const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('index', {
    index: listsIndex,
    id,
    body,
  });
  return {
    id: response._id,
    ...body,
  };
};
