/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { Description, Id, ListSchema, MetaOrUndefined, Name, Type } from '../../../common/schemas';

import { getList } from './get_list';
import { createList } from './create_list';

export interface CreateListIfItDoesNotExistOptions {
  id: Id;
  type: Type;
  name: Name;
  description: Description;
  callCluster: LegacyAPICaller;
  listIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
}

export const createListIfItDoesNotExist = async ({
  id,
  name,
  type,
  description,
  callCluster,
  listIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
}: CreateListIfItDoesNotExistOptions): Promise<ListSchema> => {
  const list = await getList({ callCluster, id, listIndex });
  if (list == null) {
    return createList({
      callCluster,
      dateNow,
      description,
      id,
      listIndex,
      meta,
      name,
      tieBreaker,
      type,
      user,
    });
  } else {
    return list;
  }
};
