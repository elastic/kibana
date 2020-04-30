/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import { ListItemArraySchema, Type } from '../../../common/schemas';

import { getListItemByValues } from '.';

export interface GetListItemByValueOptions {
  listId: string;
  callCluster: APICaller;
  listItemIndex: string;
  type: Type;
  value: string;
}

export const getListItemByValue = async ({
  listId,
  callCluster,
  listItemIndex,
  type,
  value,
}: GetListItemByValueOptions): Promise<ListItemArraySchema> =>
  getListItemByValues({
    callCluster,
    listId,
    listItemIndex,
    type,
    value: [value],
  });
