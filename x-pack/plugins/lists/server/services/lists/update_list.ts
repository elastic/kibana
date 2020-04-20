/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';

import {
  DescriptionOrUndefined,
  Id,
  ListsSchema,
  MetaOrUndefined,
  NameOrUndefined,
  UpdateEsListsSchema,
} from '../../../common/schemas';
import { DataClient } from '../../types';

import { getList } from '.';

interface UpdateListOptions {
  id: Id;
  dataClient: DataClient;
  listsIndex: string;
  user: string;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
}

export const updateList = async ({
  id,
  name,
  description,
  dataClient,
  listsIndex,
  user,
  meta,
}: UpdateListOptions): Promise<ListsSchema | null> => {
  const updatedAt = new Date().toISOString();
  const list = await getList({ dataClient, id, listsIndex });
  if (list == null) {
    return null;
  } else {
    const doc: UpdateEsListsSchema = {
      description,
      meta,
      name,
      updated_at: updatedAt,
      updated_by: user,
    };
    const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('update', {
      body: { doc },
      id,
      index: listsIndex,
    });
    return {
      created_at: list.created_at,
      created_by: list.created_by,
      description: description ?? list.description,
      id: response._id,
      meta,
      name: name ?? list.name,
      tie_breaker_id: list.tie_breaker_id,
      type: list.type,
      updated_at: updatedAt,
      updated_by: user,
    };
  }
};
