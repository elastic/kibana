/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';

import { CallAsCurrentUser } from '../../types';
import {
  Description,
  IdOrUndefined,
  IndexEsListSchema,
  ListSchema,
  MetaOrUndefined,
  Name,
  Type,
} from '../../../common/schemas';

export interface CreateListOptions {
  id: IdOrUndefined;
  type: Type;
  name: Name;
  description: Description;
  callAsCurrentUser: CallAsCurrentUser;
  listIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
}

export const createList = async ({
  id,
  name,
  type,
  description,
  callAsCurrentUser,
  listIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
}: CreateListOptions): Promise<ListSchema> => {
  const createdAt = dateNow ?? new Date().toISOString();
  const body: IndexEsListSchema = {
    created_at: createdAt,
    created_by: user,
    description,
    meta,
    name,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_at: createdAt,
    updated_by: user,
  };
  const response: CreateDocumentResponse = await callAsCurrentUser('index', {
    body,
    id,
    index: listIndex,
  });
  return {
    id: response._id,
    ...body,
  };
};
