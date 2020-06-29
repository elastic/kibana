/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import {
  DescriptionOrUndefined,
  Id,
  ListSchema,
  MetaOrUndefined,
  NameOrUndefined,
  UpdateEsListSchema,
} from '../../../common/schemas';

import { getList } from '.';

export interface UpdateListOptions {
  id: Id;
  callCluster: LegacyAPICaller;
  listIndex: string;
  user: string;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  dateNow?: string;
}

export const updateList = async ({
  id,
  name,
  description,
  callCluster,
  listIndex,
  user,
  meta,
  dateNow,
}: UpdateListOptions): Promise<ListSchema | null> => {
  const updatedAt = dateNow ?? new Date().toISOString();
  const list = await getList({ callCluster, id, listIndex });
  if (list == null) {
    return null;
  } else {
    const doc: UpdateEsListSchema = {
      description,
      meta,
      name,
      updated_at: updatedAt,
      updated_by: user,
    };
    const response = await callCluster<CreateDocumentResponse>('update', {
      body: { doc },
      id,
      index: listIndex,
    });
    return {
      created_at: list.created_at,
      created_by: list.created_by,
      description: description ?? list.description,
      deserializer: list.deserializer,
      id: response._id,
      meta,
      name: name ?? list.name,
      serializer: list.serializer,
      tie_breaker_id: list.tie_breaker_id,
      type: list.type,
      updated_at: updatedAt,
      updated_by: user,
    };
  }
};
