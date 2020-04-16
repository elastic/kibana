/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';

import { ListsSchema } from '../../common/schemas';
import { DataClient, ElasticListUpdateInputType } from '../types';

import { getList } from '.';

interface UpdateListOptions {
  id: string;
  name: string | null | undefined;
  description: string | null | undefined;
  dataClient: DataClient;
  listsIndex: string;
  user: string;
}

export const updateList = async ({
  id,
  name,
  description,
  dataClient,
  listsIndex,
  user,
}: UpdateListOptions): Promise<ListsSchema | null> => {
  const updatedAt = new Date().toISOString();
  const list = await getList({ id, dataClient, listsIndex });
  if (list == null) {
    return null;
  } else {
    const doc: ElasticListUpdateInputType = {
      name,
      description,
      updated_at: updatedAt,
      updated_by: user,
    };
    // There isn't a UpdateDocumentResponse so I am using a CreateDocumentResponse here for the type
    const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('update', {
      index: listsIndex,
      id,
      body: { doc },
    });
    return {
      id: response._id,
      name: name ?? list.name,
      description: description ?? list.description,
      created_at: list.created_at,
      updated_at: updatedAt,
      tie_breaker_id: list.tie_breaker_id,
      type: list.type,
      updated_by: user,
      created_by: list.created_by,
    };
  }
};
